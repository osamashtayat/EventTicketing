import { create } from 'zustand';
import type { TimeDisplay } from '../utils/date-time';
export function readPreference(storage: Pick<Storage, 'getItem'> | undefined): TimeDisplay {
  try {
    const raw: unknown = JSON.parse(storage?.getItem('event-ticketing-display') ?? 'null');
    if (
      typeof raw === 'object' &&
      raw !== null &&
      'version' in raw &&
      raw.version === 1 &&
      'timeDisplay' in raw &&
      raw.timeDisplay === 'UTC'
    )
      return 'UTC';
  } catch {
    /* Storage is optional. */
  }
  return 'local';
}
function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
export const useDisplayPreferences = create<{
  timeDisplay: TimeDisplay;
  setTimeDisplay: (mode: TimeDisplay) => void;
}>((set) => ({
  timeDisplay: readPreference(storage()),
  setTimeDisplay: (mode) => {
    set({ timeDisplay: mode });
    try {
      storage()?.setItem(
        'event-ticketing-display',
        JSON.stringify({ version: 1, timeDisplay: mode }),
      );
    } catch {
      /* Continue without persistence. */
    }
  },
}));
