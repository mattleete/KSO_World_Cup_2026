// Shared league helpers used by the onboarding modal, account modals and the
// Draft tab's group flow so create/join behave identically everywhere.

const INVITE_WORDS = ['WOLF', 'HAWK', 'BULL', 'BEAR', 'LION', 'GOAT', 'LYNX', 'PUMA', 'IBIS', 'KITE']

// Generates a short readable invite code like "WOLF-42".
export function generateInviteCode() {
  const word = INVITE_WORDS[Math.floor(Math.random() * INVITE_WORDS.length)]
  const num = Math.floor(Math.random() * 90) + 10
  return `${word}-${num}`
}

// Single source of truth for the "couldn't join" copy. A 23505 here means
// either the (group_id, user_id) or (group_id, display_name) unique
// constraint tripped, so cover both cases in one message.
export const JOIN_CONFLICT_MESSAGE =
  "Couldn't join — you're already in this league, or that name is taken here."

export const INVITE_NOT_FOUND_MESSAGE =
  'Invite code not found. Double-check and try again.'
