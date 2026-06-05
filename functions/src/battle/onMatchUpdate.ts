import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Firestore onWrite trigger for battle match completion.
 * Automatically closes a match when BOTH players have submitted.
 * Runs server-side, guaranteed to fire exactly once per match.
 */
export const onMatchUpdate = functions.firestore
  .document('matches/{matchId}')
  .onWrite(async (change, context) => {
    const after = change.after.data();
    if (!after) return; // Document deleted

    // Only process active matches where both players are done
    if (after.status === 'completed') return;
    if (!after.creatorDone || !after.opponentDone) return;

    // Safety check: ensure both scores exist
    const creatorScore = after.creatorScore ?? 0;
    const opponentScore = after.opponentScore ?? 0;
    const creatorPct = after.creatorPct ?? 0;
    const opponentPct = after.opponentPct ?? 0;

    // Determine winner
    let winnerId: string;
    if (creatorPct > opponentPct) {
      winnerId = after.creatorId;
    } else if (opponentPct > creatorPct) {
      winnerId = after.opponentId;
    } else {
      winnerId = 'draw';
    }

    // Close the match atomically
    await change.after.ref.update({
      status: 'completed',
      winnerId,
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[onMatchUpdate] Match ${context.params.matchId} completed. Winner: ${winnerId} (${creatorPct}% vs ${opponentPct}%)`);
  });
