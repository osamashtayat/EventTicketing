import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { passwordHint, validatePassword } from '../../../utils/password';
import { Field } from '../../../components/ui/Field';
import { Button } from '../../../components/ui/Button';
import { ErrorPanel } from '../../../components/ui/Feedback';
import { register as registerAccount } from '../api';
import type { RegisterValues } from '../types';
export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>();
  const [error, setError] = useState<unknown>();
  return (
    <form
      className="form-stack"
      onSubmit={handleSubmit(async (values) => {
        setError(undefined);
        try {
          await registerAccount(values);
          resetField('password');
          onSuccess();
        } catch (e) {
          setError(e);
        }
      })}
    >
      <Field
        id="first-name"
        label="First name"
        autoComplete="given-name"
        {...register('firstName', {
          required: 'Enter your first name.',
          validate: (v) => !!v.trim() || 'Enter your first name.',
        })}
        error={errors.firstName?.message}
      />
      <Field
        id="last-name"
        label="Last name"
        autoComplete="family-name"
        {...register('lastName', {
          required: 'Enter your last name.',
          validate: (v) => !!v.trim() || 'Enter your last name.',
        })}
        error={errors.lastName?.message}
      />
      <Field
        id="register-email"
        label="Email"
        type="email"
        autoComplete="email"
        {...register('email', { required: 'Enter your email.' })}
        error={errors.email?.message}
      />
      <Field
        id="register-password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint={passwordHint}
        {...register('password', { required: 'Enter a password.', validate: validatePassword })}
        error={errors.password?.message}
      />
      {error != null && <ErrorPanel error={error} />}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
