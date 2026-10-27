import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vault } from '../../lib/auth/session-vault';
import { keys } from '../../lib/query/keys';
import { getMe } from './api';
export function useSession() {
  useSyncExternalStore(vault.subscribe, vault.revision, vault.revision);
  const generation = vault.generation();
  const active = !!vault.token();
  return { generation, active };
}
export function useMe() {
  const session = useSession();
  return useQuery({
    queryKey: keys.me(session.generation),
    queryFn: ({ signal }) => getMe(signal),
    enabled: session.active,
    staleTime: 0,
  });
}
