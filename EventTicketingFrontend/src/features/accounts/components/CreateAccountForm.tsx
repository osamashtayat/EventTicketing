import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Field } from '../../../components/ui/Field';
import { Button } from '../../../components/ui/Button';
import { ErrorPanel } from '../../../components/ui/Feedback';
import { vault } from '../../../lib/auth/session-vault';
import { requiredText } from '../../../utils/form-values';
import { passwordHint, validatePassword } from '../../../utils/password';
import { createAccount } from '../api';
import { useCreateAccount } from '../mutations';
import type { AccountValues } from '../types';
export function CreateAccountForm() {
  const {
    register,
    getValues,
    resetField,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountValues>({
    defaultValues: { firstName: '', lastName: '', email: '', password: '', role: 'EventOrganizer' },
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>();
  const mutation = useCreateAccount(async () => {
    const values = getValues();
    if (values.role !== 'Admin' && values.role !== 'EventOrganizer')
      throw new Error('Choose Admin or EventOrganizer.');
    await createAccount({
      firstName: requiredText(values.firstName, 'First name'),
      lastName: requiredText(values.lastName, 'Last name'),
      email: values.email.trim(),
      password: values.password,
      role: values.role,
    });
  });
  return (
    <form
      className="form-stack"
      onSubmit={handleSubmit(async () => {
        const generation = vault.generation();
        setSaved(false);
        setError(undefined);
        try {
          await mutation.mutateAsync();
          resetField('password');
          mutation.reset();
          if (generation === vault.generation()) setSaved(true);
        } catch (e) {
          setError(e);
        }
      })}
    >
      {saved && <p role="status">Account created. The temporary password has been cleared.</p>}
      <Field
        id="account-first-name"
        label="First name"
        autoComplete="off"
        {...register('firstName', { required: 'Enter a first name.' })}
        error={errors.firstName?.message}
      />
      <Field
        id="account-last-name"
        label="Last name"
        autoComplete="off"
        {...register('lastName', { required: 'Enter a last name.' })}
        error={errors.lastName?.message}
      />
      <Field
        id="account-email"
        label="Email"
        type="email"
        autoComplete="off"
        {...register('email', { required: 'Enter an email address.' })}
        error={errors.email?.message}
      />
      <Field
        id="account-password"
        label="Temporary password"
        type="password"
        autoComplete="new-password"
        hint={passwordHint}
        {...register('password', {
          required: 'Enter a temporary password.',
          validate: validatePassword,
        })}
        error={errors.password?.message}
      />
      <div className="field">
        <label htmlFor="account-role">New account role</label>
        <select id="account-role" {...register('role')}>
          <option value="EventOrganizer">Event organizer</option>
          <option value="Admin">Administrator</option>
        </select>
      </div>
      {error != null && <ErrorPanel error={error} />}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
