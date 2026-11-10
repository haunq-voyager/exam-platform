const keyFor = (attemptId: number | string) => `exam-rules-ack:${attemptId}`;

/** Remember (per browser tab session) that the student accepted the exam rules for this attempt. */
export function markRulesAcknowledged(attemptId: number | string): void {
  try {
    sessionStorage.setItem(keyFor(attemptId), "1");
  } catch {
    // Storage can be unavailable (private mode); the exam page simply asks again.
  }
}

export function isRulesAcknowledged(attemptId: number | string): boolean {
  try {
    return sessionStorage.getItem(keyFor(attemptId)) === "1";
  } catch {
    return false;
  }
}
