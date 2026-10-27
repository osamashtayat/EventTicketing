import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Field } from '../../../components/ui/Field';
import { Button } from '../../../components/ui/Button';
import { ErrorPanel } from '../../../components/ui/Feedback';
import { requiredText } from '../../../utils/form-values';
import { vault } from '../../../lib/auth/session-vault';
import { useCreateCountry, useUpdateCountry } from '../mutations';
import type { CountrySummary, CountryWrite } from '../types';
export function CountryForm({
  existing,
  onSaved,
}: {
  existing?: CountrySummary;
  onSaved: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CountryWrite>({
    defaultValues: { name: existing?.name ?? '', shortName: existing?.shortName ?? '' },
  });
  const create = useCreateCountry();
  const update = useUpdateCountry();
  const [error, setError] = useState<unknown>();
  return (
    <form
      className="form-stack"
      onSubmit={handleSubmit(async (values) => {
        setError(undefined);
        const generation = vault.generation();
        try {
          const body = {
            name: requiredText(values.name, 'Country name'),
            shortName: requiredText(values.shortName, 'Short name'),
          };
          if (existing) await update.mutateAsync({ id: existing.id, body });
          else await create.mutateAsync(body);
          if (generation === vault.generation()) {
            reset();
            onSaved();
          }
        } catch (e) {
          setError(e);
        }
      })}
    >
      <Field
        id={`country-name-${existing?.id ?? 'new'}`}
        label="Country name"
        {...register('name', { required: 'Enter the country name.' })}
        error={errors.name?.message}
      />
      <Field
        id={`country-short-name-${existing?.id ?? 'new'}`}
        label="Short name"
        hint="Text abbreviation; no ISO format is required."
        {...register('shortName', { required: 'Enter a short name.' })}
        error={errors.shortName?.message}
      />
      {error != null && <ErrorPanel error={error} />}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : existing ? 'Save country' : 'Create country'}
      </Button>
    </form>
  );
}
