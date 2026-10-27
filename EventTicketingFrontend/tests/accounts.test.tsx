import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { CreateAccountForm } from '../src/features/accounts/components/CreateAccountForm';
import { configureApi } from '../src/lib/api/client';
import { makeQueryClient } from '../src/lib/query/client';
it('accepts empty account 201 and does not retain password variables/results in Query', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(null, { status: 201 }));
  configureApi('https://api.test', {
    generation: () => 0,
    token: () => 'fixture',
    prepare: async () => {},
    refresh: async () => {},
  });
  const client = makeQueryClient();
  render(
    <QueryClientProvider client={client}>
      <CreateAccountForm />
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('First name'), 'New');
  await user.type(screen.getByLabelText('Last name'), 'Organizer');
  await user.type(screen.getByLabelText('Email'), 'organizer@example.test');
  await user.type(screen.getByLabelText('Temporary password'), 'Fixture-1');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Account created');
  expect(screen.getByLabelText('Temporary password')).toHaveValue('');
  expect(fetcher).toHaveBeenCalledTimes(1);
  await waitFor(() =>
    expect(
      JSON.stringify(
        client
          .getMutationCache()
          .getAll()
          .map((m) => m.state),
      ),
    ).not.toContain('Fixture-1'),
  );
  for (const mutation of client.getMutationCache().getAll()) {
    expect(mutation.state.variables).toBeUndefined();
    expect(mutation.state.data).toBeUndefined();
  }
});
