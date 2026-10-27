import { useMutation } from '@tanstack/react-query';
/** No password-bearing variables/results enter the mutation cache. */
export function useCreateAccount(submit: () => Promise<void>) {
  return useMutation({ mutationFn: submit, retry: false, networkMode: 'always', gcTime: 0 });
}
