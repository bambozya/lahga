import { CONFIRM_SCORE, GUEST_WEIGHT } from '../config/rules'

/**
 * Where a draft stands (schema.wordEntryLinks.needsReview) after the answers
 * to «هل تُقال هكذا؟»: members' net votes on the link count whole, guests' at
 * GUEST_WEIGHT. One rule, read from two places: settleDraft (server/utils/
 * votes.ts) clears the mark at +CONFIRM_SCORE, and the check queue
 * (server/api/check.get.ts) stops asking at the mirror, −CONFIRM_SCORE.
 */
export const draftNet = (score: number, guestNet: number) => score + GUEST_WEIGHT * guestNet

/** Enough «yes» to take the mark off. */
export const isConfirmed = (score: number, guestNet: number) => draftNet(score, guestNet) >= CONFIRM_SCORE

/** Enough «no» that speakers have turned it down: no longer asked, listed for staff instead. */
export const isTurnedDown = (score: number, guestNet: number) => draftNet(score, guestNet) <= -CONFIRM_SCORE
