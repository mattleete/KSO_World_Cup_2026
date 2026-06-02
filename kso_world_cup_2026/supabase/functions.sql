-- KSO World Cup 2026 — Supabase Postgres functions
--
-- Run this whole file in the Supabase dashboard → SQL Editor → New query → Run.
-- Every function uses `create or replace`, so re-running is safe and idempotent.
--
-- All functions are SECURITY DEFINER: they run with the database owner's
-- privileges (bypassing Row Level Security), so the commissioner / membership
-- checks *inside* each function are what enforce access. Keep those checks.
--
-- NOTE: the draft-pick RPCs (make_pick, commissioner_pick, undo_pick,
-- auto_draft) were created earlier directly in the dashboard and are not yet
-- reproduced here. The functions below are the league-management + reset
-- functions used by MyLeaguesModal and the Draft commissioner controls.

-- ── Reset the draft ────────────────────────────────────────────────────────────
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

-- ── Leave a league ───────────────────────────────────────────────────────────--
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

-- ── Remove a member ──────────────────────────────────────────────────────────--
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

-- ── Delete a league ──────────────────────────────────────────────────────────--
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
