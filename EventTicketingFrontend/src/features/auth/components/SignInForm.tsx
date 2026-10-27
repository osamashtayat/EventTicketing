import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { Field } from '../../../components/ui/Field';
import { Button } from '../../../components/ui/Button';
import { ErrorPanel } from '../../../components/ui/Feedback';
import type { LoginValues } from '../types';
export function SignInForm({
  onSignIn,
  onSuccess,
}: {
  onSignIn: (values: LoginValues) => Promise<void>;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>();
  const [error, setError] = useState<unknown>();
  const busy = useRef(false);
  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        void handleSubmit(async (values) => {
          if (busy.current) return;
          busy.current = true;
          setError(undefined);
          try {
            await onSignIn({
              email: values.email,
              password: values.password,
              ...(values.twoFactorCode ? { twoFactorCode: values.twoFactorCode } : {}),
              ...(values.twoFactorRecoveryCode
                ? { twoFactorRecoveryCode: values.twoFactorRecoveryCode }
                : {}),
            });
            resetField('password');
            resetField('twoFactorCode');
            resetField('twoFactorRecoveryCode');
            onSuccess();
          } catch (e) {
            setError(e);
          } finally {
            busy.current = false;
          }
        })(event);
      }}
    >
      <Field
        id="sign-in-email"
        type="email"
        label="Email"
        autoComplete="email"
        {...register('email', { required: 'Enter your email.' })}
        error={errors.email?.message}
      />
      <Field
        id="sign-in-password"
        type="password"
        label="Password"
        autoComplete="current-password"
        {...register('password', { required: 'Enter your password.' })}
        error={errors.password?.message}
      />
      <details>
        <summary>Two-factor or recovery code</summary>
        <div className="form-stack">
          <Field
            id="two-factor-code"
            label="Two-factor code"
            autoComplete="one-time-code"
            {...register('twoFactorCode')}
          />
          <Field
            id="recovery-code"
            label="Recovery code"
            autoComplete="off"
            {...register('twoFactorRecoveryCode')}
          />
        </div>
      </details>
      {error != null && <ErrorPanel error={error} />}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
      <p className="muted text-sm">Your session stays in this tab and ends on reload.</p>
      <p>
        New here?{' '}
        <Link className="text-link" to="/register">
          Create an account
        </Link>
      </p>
    </form>
  );
}
