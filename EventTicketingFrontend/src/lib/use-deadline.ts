import { useEffect, useState } from 'react';
/** Client clock is advisory. Wake at a cutoff and when the tab regains focus. */
export function useBeforeDeadline(timestamp: string, inclusive = false): boolean {
  const [now, setNow] = useState(() => Date.now());
  const deadline = Date.parse(timestamp) + (inclusive ? 1 : 0);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const remaining = deadline - Date.now();
    const timer =
      remaining > 0
        ? window.setTimeout(update, Math.min(remaining, 2147483647))
        : now < deadline
          ? window.setTimeout(update, 0)
          : undefined;
    window.addEventListener('focus', update);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', update);
    };
  }, [deadline, now]);
  return now < deadline;
}
