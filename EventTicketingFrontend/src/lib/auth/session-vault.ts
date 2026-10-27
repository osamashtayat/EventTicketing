export interface Credentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
let credentials: Credentials | undefined;
let generation = 0;
let revision = 0;
const listeners = new Set<() => void>();
export const vault = {
  generation: () => generation,
  revision: () => revision,
  token: () => credentials?.accessToken,
  credentials: () => credentials,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  clear: () => {
    credentials = undefined;
    generation++;
    revision++;
    for (const listener of listeners) listener();
  },
  install: (next: Credentials, expected: number) => {
    if (generation !== expected) throw new DOMException('Session changed.', 'AbortError');
    credentials = next;
    revision++;
    for (const listener of listeners) listener();
  },
};
