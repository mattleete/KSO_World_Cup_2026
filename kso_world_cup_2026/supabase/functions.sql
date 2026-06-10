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

-- ════════════════════════════════════════════════════════════════════════════
--  Admin page — commissioner draft management (post-draft)
-- ════════════════════════════════════════════════════════════════════════════

-- ── Remove a member (post-draft) ───────────────────────────────────────────--
-- Commissioner-only. Unlike remove_member (pre-draft only), this works at any
-- time: it deletes the member's picks, order entries, and preferences first, so
-- their drafted teams become available again, then removes the member.
create or replace function admin_remove_member(p_group_id uuid, p_member_id uuid)
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
    raise exception 'Only the commissioner can remove members';
  end if;

  -- Confirm the member belongs to this league before touching anything.
  if not exists (
    select 1 from group_members where id = p_member_id and group_id = p_group_id
  ) then
    raise exception 'Member not found in this league';
  end if;

  select id into v_session_id from draft_session where group_id = p_group_id;
  if v_session_id is not null then
    delete from draft_picks
    where draft_session_id = v_session_id and group_member_id = p_member_id;
    delete from draft_order
    where draft_session_id = v_session_id and group_member_id = p_member_id;
  end if;

  delete from draft_preferences where group_member_id = p_member_id;
  delete from group_members where id = p_member_id and group_id = p_group_id;
end;
$$;

-- ── Edit a member's display name ────────────────────────────────────────────--
-- Commissioner-only. Lets the commissioner fix typos in any player's name,
-- respecting the (group_id, display_name) unique constraint.
create or replace function admin_set_member_name(p_group_id uuid, p_member_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(p_name);
begin
  if not exists (
    select 1 from groups
    where id = p_group_id and commissioner_id = auth.uid()
  ) then
    raise exception 'Only the commissioner can rename members';
  end if;

  if v_name = '' then
    raise exception 'Name can''t be empty';
  end if;

  if exists (
    select 1 from group_members
    where group_id = p_group_id and display_name = v_name and id <> p_member_id
  ) then
    raise exception 'Another player in this league already uses that name';
  end if;

  update group_members
  set display_name = v_name
  where id = p_member_id and group_id = p_group_id;
end;
$$;

-- ── Reassign a drafted team (swap-aware) ────────────────────────────────────--
-- Commissioner-only. Changes the team on p_pick_id to p_team_id. If another
-- pick in the same draft already holds p_team_id, the two picks SWAP teams in a
-- single transaction. Implemented as delete-then-reinsert of the affected
-- pick(s) so it never trips the (draft_session_id, team_id) unique constraint.
create or replace function admin_set_pick_team(p_pick_id uuid, p_team_id integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pick   draft_picks;   -- the pick being edited
  v_other  draft_picks;   -- the pick currently holding p_team_id (if any)
begin
  if p_team_id < 1 or p_team_id > 48 then
    raise exception 'Invalid team';
  end if;

  -- Load the target pick and verify the caller commissions its league.
  select dp.* into v_pick
  from draft_picks dp
  join draft_session ds on ds.id = dp.draft_session_id
  join groups g on g.id = ds.group_id
  where dp.id = p_pick_id and g.commissioner_id = auth.uid();
  if not found then raise exception 'Not authorized'; end if;

  -- No-op if it already holds that team.
  if v_pick.team_id = p_team_id then return; end if;

  select * into v_other from draft_picks
  where draft_session_id = v_pick.draft_session_id and team_id = p_team_id;

  if found then
    -- Swap: delete both, reinsert with teams exchanged (preserves pick slots).
    delete from draft_picks where id in (v_pick.id, v_other.id);
    insert into draft_picks (draft_session_id, pick_number, group_member_id, team_id, picked_at)
    values
      (v_pick.draft_session_id,  v_pick.pick_number,  v_pick.group_member_id,  p_team_id,      v_pick.picked_at),
      (v_other.draft_session_id, v_other.pick_number, v_other.group_member_id, v_pick.team_id, v_other.picked_at);
  else
    -- Target team is unowned — straight reassignment.
    update draft_picks set team_id = p_team_id where id = v_pick.id;
  end if;
end;
$$;

-- ── Scramble the draft order ────────────────────────────────────────────────--
-- Commissioner-only. Re-rolls the snake draft order with a fresh random base
-- sequence. Allowed only before any picks have been made (right after the draft
-- starts) so it can't corrupt a draft in progress. Resets to pick #1.
create or replace function scramble_draft_order(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_members uuid[];
  v_n integer;
  v_total integer;
  v_round integer;
  v_pos integer;
  v_idx integer;
  i integer;
begin
  if not exists (
    select 1 from groups
    where id = p_group_id and commissioner_id = auth.uid()
  ) then
    raise exception 'Only the commissioner can scramble the draft order';
  end if;

  select id into v_session_id from draft_session where group_id = p_group_id;
  if v_session_id is null then
    raise exception 'The draft hasn''t started yet';
  end if;

  if exists (select 1 from draft_picks where draft_session_id = v_session_id) then
    raise exception 'Can''t scramble after picks have been made — reset the draft first';
  end if;

  -- Shuffled base order of this league's players.
  select array_agg(id order by random()) into v_members
  from group_members where group_id = p_group_id;
  v_n := coalesce(array_length(v_members, 1), 0);
  if v_n = 0 then raise exception 'No players to order'; end if;

  -- Keep the same number of pick slots as the existing order.
  select count(*) into v_total from draft_order where draft_session_id = v_session_id;
  if v_total = 0 then raise exception 'No draft order to scramble'; end if;

  delete from draft_order where draft_session_id = v_session_id;

  -- Regenerate the snake: even rounds forward, odd rounds reversed.
  for i in 0 .. v_total - 1 loop
    v_round := i / v_n;
    v_pos   := i % v_n;
    if v_round % 2 = 0 then
      v_idx := v_pos;
    else
      v_idx := v_n - 1 - v_pos;
    end if;
    insert into draft_order (draft_session_id, pick_number, group_member_id)
    values (v_session_id, i + 1, v_members[v_idx + 1]);  -- arrays are 1-based
  end loop;

  update draft_session set current_pick_number = 1 where id = v_session_id;
end;
$$;

-- ── Add a pick for a member (post-draft, undrafted teams only) ──────────────--
-- Commissioner-only. Manually assigns a still-undrafted team to a member — for
-- someone who joined after the draft and needs teams. Appends a draft_picks row
-- with the next pick_number and never touches anyone else's picks. The team must
-- not already be drafted in this session.
create or replace function admin_add_pick(p_group_id uuid, p_member_id uuid, p_team_id integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_next_pick integer;
begin
  if not exists (
    select 1 from groups where id = p_group_id and commissioner_id = auth.uid()
  ) then
    raise exception 'Only the commissioner can add picks';
  end if;

  if not exists (
    select 1 from group_members where id = p_member_id and group_id = p_group_id
  ) then
    raise exception 'Member not found in this league';
  end if;

  select id into v_session_id from draft_session where group_id = p_group_id;
  if v_session_id is null then
    raise exception 'The draft hasn''t started yet';
  end if;

  if exists (
    select 1 from draft_picks where draft_session_id = v_session_id and team_id = p_team_id
  ) then
    raise exception 'That team has already been drafted';
  end if;

  select coalesce(max(pick_number), 0) + 1 into v_next_pick
  from draft_picks where draft_session_id = v_session_id;

  insert into draft_picks (draft_session_id, pick_number, group_member_id, team_id, picked_at)
  values (v_session_id, v_next_pick, p_member_id, p_team_id, now());
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
--  Match results — manual scores (superadmin only)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Global, canonical manual results. A row overrides the live WC2026 API feed for
-- the same match everywhere points are computed (merged client-side by team pair
-- + stage). Writes are locked to the superadmin email; everyone may read.

create table if not exists match_results (
  id          uuid primary key default gen_random_uuid(),
  team1       text not null,
  score1      integer not null,
  team2       text not null,
  score2      integer not null,
  stage       text,
  played_at   timestamptz,
  updated_by  uuid,
  updated_at  timestamptz not null default now()
);

alter table match_results enable row level security;

-- Everyone (incl. anon) may read scores; writes go only through the SECURITY
-- DEFINER functions below (no insert/update/delete policies = direct writes blocked).
drop policy if exists "match_results readable by all" on match_results;
create policy "match_results readable by all" on match_results for select using (true);

-- ── Insert or update a manual result (superadmin) ──────────────────────────--
-- p_id null → insert a new result; otherwise update that row. Returns the id.
create or replace function upsert_match_result(
  p_id uuid,
  p_team1 text,
  p_score1 integer,
  p_team2 text,
  p_score2 integer,
  p_stage text,
  p_played_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.email() <> 'matt.c.leete@gmail.com' then
    raise exception 'Not authorized';
  end if;

  if p_id is null then
    insert into match_results (team1, score1, team2, score2, stage, played_at, updated_by, updated_at)
    values (p_team1, p_score1, p_team2, p_score2, p_stage, p_played_at, auth.uid(), now())
    returning id into v_id;
  else
    update match_results
    set team1 = p_team1, score1 = p_score1,
        team2 = p_team2, score2 = p_score2,
        stage = p_stage, played_at = p_played_at,
        updated_by = auth.uid(), updated_at = now()
    where id = p_id
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

-- ── Delete one manual result (superadmin) ──────────────────────────────────--
create or replace function delete_match_result(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.email() <> 'matt.c.leete@gmail.com' then
    raise exception 'Not authorized';
  end if;
  delete from match_results where id = p_id;
end;
$$;

-- ── Reset all manual results (superadmin) ──────────────────────────────────--
-- Wipes every manual score back to a fresh/unplayed baseline (for testing).
create or replace function reset_all_match_results()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.email() <> 'matt.c.leete@gmail.com' then
    raise exception 'Not authorized';
  end if;
  delete from match_results where id is not null;  -- WHERE satisfies sql_safe_updates
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
--  Draft preferences
-- ════════════════════════════════════════════════════════════════════════════

-- ── Save a member's full draft preference order (atomic) ────────────────────--
-- Replaces the member's entire preference list in one transaction.
-- A plain upsert can't do this safely: draft_preferences has unique constraints
-- on BOTH (group_member_id, team_id) and (group_member_id, rank). Rewriting the
-- ranks in place collides on the rank index mid-statement (Postgres checks the
-- non-deferred unique constraint row-by-row), so any reorder aborts and the
-- whole save silently fails. Delete-then-insert inside a single function call
-- avoids the collision and is atomic. The caller must own the membership.
create or replace function save_draft_preferences(p_member_id uuid, p_team_ids integer[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from group_members where id = p_member_id;
  if v_user_id is null then
    raise exception 'Member not found';
  end if;
  if v_user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  delete from draft_preferences where group_member_id = p_member_id;

  insert into draft_preferences (group_member_id, team_id, rank)
  select p_member_id, t.team_id, t.ord
  from unnest(p_team_ids) with ordinality as t(team_id, ord);
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
--  Account
-- ════════════════════════════════════════════════════════════════════════════

-- ── Rename yourself across all your leagues ─────────────────────────────────--
-- The per-league group_members.display_name is the source of truth shown on the
-- leaderboard / draft / fixtures (auth user_metadata can't be read for other
-- users). The account "Update your name" edit only changed the auth metadata, so
-- the visible name never updated. This syncs every membership the caller owns.
-- Respects the (group_id, display_name) unique constraint with a friendly error.
create or replace function set_my_display_name(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(p_name);
begin
  if v_name is null or v_name = '' then
    raise exception 'Name cannot be empty';
  end if;

  update group_members
  set display_name = v_name
  where user_id = auth.uid();
exception
  when unique_violation then
    raise exception 'That name is already taken in one of your leagues';
end;
$$;
