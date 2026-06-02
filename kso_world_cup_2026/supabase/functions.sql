-- KSO World Cup 2026 — Supabase Postgres functions
--
-- Run this whole file in the Supabase dashboard → SQL Editor → New query → Run.
-- Every function uses `create or replace`, so re-running is safe and idempotent.
-- Functions are ordered so dependencies come first (auto_draft_for_session is
-- defined before auto_draft, which calls it).
--
-- All functions are SECURITY DEFINER: they run with the database owner's
-- privileges (bypassing Row Level Security), so the commissioner / membership /
-- turn checks *inside* each function are what enforce access. Keep those checks.
--
-- The draft-pick functions were originally authored in the Supabase dashboard
-- and dumped here via pg_get_functiondef so the whole schema is in one place;
-- they are reproduced verbatim (note they don't pin search_path, unlike the
-- league-management functions below).

-- ════════════════════════════════════════════════════════════════════════════
--  Draft-pick functions
-- ════════════════════════════════════════════════════════════════════════════

-- ── Auto-draft helper ──────────────────────────────────────────────────────--
-- Picks the current player's highest-ranked still-available team from their
-- preferences; falls back to the lowest available team id (1–48). Advances the
-- pick, or completes the draft on the final pick. Called by auto_draft().
create or replace function auto_draft_for_session(p_draft_session_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_session draft_session;
  v_order_entry draft_order;
  v_team_id integer;
  v_total_picks integer;
begin
  select * into v_session from draft_session
  where id = p_draft_session_id and status = 'active' for update;
  if not found then return; end if;

  select * into v_order_entry from draft_order
  where draft_session_id = p_draft_session_id
    and pick_number = v_session.current_pick_number;
  if not found then return; end if;

  select dp.team_id into v_team_id
  from draft_preferences dp
  where dp.group_member_id = v_order_entry.group_member_id
    and not exists (
      select 1 from draft_picks ep
      where ep.draft_session_id = p_draft_session_id and ep.team_id = dp.team_id
    )
  order by dp.rank asc limit 1;

  if v_team_id is null then
    select team_id into v_team_id from generate_series(1, 48) as team_id
    where not exists (
      select 1 from draft_picks ep
      where ep.draft_session_id = p_draft_session_id and ep.team_id = team_id
    )
    order by team_id asc limit 1;
  end if;

  if v_team_id is null then return; end if;

  insert into draft_picks (draft_session_id, pick_number, group_member_id, team_id)
  values (p_draft_session_id, v_session.current_pick_number, v_order_entry.group_member_id, v_team_id);

  select count(*) into v_total_picks from draft_order where draft_session_id = p_draft_session_id;

  if v_session.current_pick_number >= v_total_picks then
    update draft_session set status = 'complete', pick_deadline = null where id = p_draft_session_id;
  else
    update draft_session
    set current_pick_number = current_pick_number + 1,
        pick_deadline = case
          when v_session.pick_timeout_seconds > 0
          then now() + (v_session.pick_timeout_seconds || ' seconds')::interval
          else null end
    where id = p_draft_session_id;
  end if;
end;
$$;

-- ── Auto-draft (commissioner trigger) ──────────────────────────────────────--
-- Commissioner-only entry point that runs auto_draft_for_session for the
-- current pick.
create or replace function auto_draft(p_draft_session_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (
    select 1 from draft_session ds join groups g on g.id = ds.group_id
    where ds.id = p_draft_session_id and g.commissioner_id = auth.uid()
  ) then raise exception 'Not authorized'; end if;
  perform auto_draft_for_session(p_draft_session_id);
end;
$$;

-- ── Make a pick (current player) ───────────────────────────────────────────--
-- Validates it's the caller's turn and the team is free, inserts the pick, and
-- advances the pick number (or completes the draft on the final pick).
create or replace function make_pick(p_draft_session_id uuid, p_team_id integer)
returns void
language plpgsql
security definer
as $$
declare
  v_session draft_session;
  v_order_entry draft_order;
  v_member group_members;
  v_total_picks integer;
begin
  select * into v_session from draft_session where id = p_draft_session_id for update;
  if not found then raise exception 'Draft session not found'; end if;
  if v_session.status != 'active' then raise exception 'Draft is not active'; end if;

  select * into v_order_entry from draft_order
  where draft_session_id = p_draft_session_id and pick_number = v_session.current_pick_number;
  if not found then raise exception 'No pick order entry found'; end if;

  select * into v_member from group_members
  where id = v_order_entry.group_member_id and user_id = auth.uid();
  if not found then raise exception 'It is not your turn'; end if;

  if exists (select 1 from draft_picks where draft_session_id = p_draft_session_id and team_id = p_team_id)
  then raise exception 'Team already picked'; end if;

  insert into draft_picks (draft_session_id, pick_number, group_member_id, team_id)
  values (p_draft_session_id, v_session.current_pick_number, v_order_entry.group_member_id, p_team_id);

  select count(*) into v_total_picks from draft_order where draft_session_id = p_draft_session_id;

  if v_session.current_pick_number >= v_total_picks then
    update draft_session set status = 'complete', pick_deadline = null where id = p_draft_session_id;
  else
    update draft_session
    set current_pick_number = current_pick_number + 1,
        pick_deadline = case
          when v_session.pick_timeout_seconds > 0
          then now() + (v_session.pick_timeout_seconds || ' seconds')::interval
          else null end
    where id = p_draft_session_id;
  end if;
end;
$$;

-- ── Commissioner pick (on behalf of current player) ────────────────────────--
-- Same as make_pick but authorised by commissioner rather than turn ownership.
create or replace function commissioner_pick(p_draft_session_id uuid, p_team_id integer)
returns void
language plpgsql
security definer
as $$
declare
  v_session draft_session;
  v_order_entry draft_order;
  v_total_picks integer;
begin
  select ds.* into v_session from draft_session ds
  join groups g on g.id = ds.group_id
  where ds.id = p_draft_session_id and g.commissioner_id = auth.uid() for update;
  if not found then raise exception 'Not authorized'; end if;
  if v_session.status != 'active' then raise exception 'Draft is not active'; end if;

  select * into v_order_entry from draft_order
  where draft_session_id = p_draft_session_id and pick_number = v_session.current_pick_number;
  if not found then raise exception 'No pick order entry found'; end if;

  if exists (select 1 from draft_picks where draft_session_id = p_draft_session_id and team_id = p_team_id)
  then raise exception 'Team already picked'; end if;

  insert into draft_picks (draft_session_id, pick_number, group_member_id, team_id)
  values (p_draft_session_id, v_session.current_pick_number, v_order_entry.group_member_id, p_team_id);

  select count(*) into v_total_picks from draft_order where draft_session_id = p_draft_session_id;

  if v_session.current_pick_number >= v_total_picks then
    update draft_session set status = 'complete', pick_deadline = null where id = p_draft_session_id;
  else
    update draft_session
    set current_pick_number = current_pick_number + 1,
        pick_deadline = case
          when v_session.pick_timeout_seconds > 0
          then now() + (v_session.pick_timeout_seconds || ' seconds')::interval
          else null end
    where id = p_draft_session_id;
  end if;
end;
$$;

-- ── Undo the last pick ─────────────────────────────────────────────────────--
-- Commissioner-only. Deletes the most recent pick and rewinds the pick number,
-- reactivating the session if it had completed.
create or replace function undo_pick(p_draft_session_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_last_pick draft_picks;
begin
  -- Verify commissioner
  if not exists (
    select 1 from draft_session ds
    join groups g on g.id = ds.group_id
    where ds.id = p_draft_session_id and g.commissioner_id = auth.uid()
  ) then raise exception 'Not authorized'; end if;

  select * into v_last_pick from draft_picks
  where draft_session_id = p_draft_session_id
  order by pick_number desc limit 1;

  if not found then raise exception 'No picks to undo'; end if;

  delete from draft_picks where id = v_last_pick.id;

  update draft_session
  set current_pick_number = v_last_pick.pick_number, status = 'active'
  where id = p_draft_session_id;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
--  League management & reset
-- ════════════════════════════════════════════════════════════════════════════

-- ── Reset the draft ────────────────────────────────────────────────────────--
-- Commissioner-only. Wipes all picks/order/session for the league so it returns
-- to the waiting room. Used by the "Reset draft" button in the draft board.
create or replace function reset_draft(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  if not exists (
    select 1 from groups
    where id = p_group_id and commissioner_id = auth.uid()
  ) then
    raise exception 'Only the commissioner can reset the draft';
  end if;

  select id into v_session_id from draft_session where group_id = p_group_id;
  if v_session_id is null then
    return;
  end if;

  delete from draft_picks where draft_session_id = v_session_id;
  delete from draft_order where draft_session_id = v_session_id;
  delete from draft_session where id = v_session_id;
end;
$$;

-- ── Leave a league ───────────────────────────────────────────────────────────
-- Any member may leave, but only before the draft has started. The commissioner
-- must transfer the role or delete the league instead of leaving.
create or replace function leave_league(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from draft_session where group_id = p_group_id) then
    raise exception 'Can''t leave after the draft has started — ask the commissioner to reset it first';
  end if;

  if exists (
    select 1 from groups
    where id = p_group_id and commissioner_id = auth.uid()
  ) then
    raise exception 'Transfer the commissioner role or delete the league before leaving';
  end if;

  delete from group_members
  where group_id = p_group_id and user_id = auth.uid();
end;
$$;

-- ── Remove a member ────────────────────────────────────────────────────────--
-- Commissioner-only, before the draft starts. p_member_id is group_members.id.
create or replace function remove_member(p_group_id uuid, p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from groups
    where id = p_group_id and commissioner_id = auth.uid()
  ) then
    raise exception 'Only the commissioner can remove members';
  end if;

  if exists (select 1 from draft_session where group_id = p_group_id) then
    raise exception 'Can''t remove members after the draft has started — reset the draft first';
  end if;

  delete from group_members
  where id = p_member_id and group_id = p_group_id;
end;
$$;

-- ── Delete a league ────────────────────────────────────────────────────────--
-- Commissioner-only. Deletes the league and every related row.
create or replace function delete_league(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  if not exists (
    select 1 from groups
    where id = p_group_id and commissioner_id = auth.uid()
  ) then
    raise exception 'Only the commissioner can delete the league';
  end if;

  select id into v_session_id from draft_session where group_id = p_group_id;
  if v_session_id is not null then
    delete from draft_picks where draft_session_id = v_session_id;
    delete from draft_order where draft_session_id = v_session_id;
    delete from draft_session where id = v_session_id;
  end if;

  delete from draft_preferences
  where group_member_id in (select id from group_members where group_id = p_group_id);
  delete from group_members where group_id = p_group_id;
  delete from groups where id = p_group_id;
end;
$$;
