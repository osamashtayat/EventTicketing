import { useState } from 'react';
import type { ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Field } from '../../../components/ui/Field';
import { Button } from '../../../components/ui/Button';
import { ErrorPanel } from '../../../components/ui/Feedback';
import { positiveInteger, requiredText } from '../../../utils/form-values';
import { vault } from '../../../lib/auth/session-vault';
import { useCreateVenue } from '../mutations';
interface Values {
  name: string;
  city: string;
  countryId: string;
  capacity: string;
  address: string;
}
export function VenueCreateForm({
  countryChoice,
  onSaved,
}: {
  countryChoice: (value: string, onChange: (value: string) => void) => ReactNode;
  onSaved: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    defaultValues: { name: '', city: '', countryId: '', capacity: '', address: '' },
  });
  const mutation = useCreateVenue();
  const [error, setError] = useState<unknown>();
  return (
    <form
      className="form-stack"
      onSubmit={handleSubmit(async (values) => {
        setError(undefined);
        const generation = vault.generation();
        try {
          await mutation.mutateAsync({
            name: requiredText(values.name, 'Venue name'),
            city: requiredText(values.city, 'City'),
            countryId: positiveInteger(values.countryId, 'Country'),
            capacity: positiveInteger(values.capacity, 'Capacity'),
            address: values.address.trim(),
          });
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
        id="venue-name"
        label="Venue name"
        {...register('name', { required: 'Enter a name.' })}
        error={errors.name?.message}
      />
      <Field
        id="venue-city"
        label="City"
        {...register('city', { required: 'Enter a city.' })}
        error={errors.city?.message}
      />
      <Controller
        control={control}
        name="countryId"
        render={({ field }) => <>{countryChoice(field.value, field.onChange)}</>}
      />
      <Field
        id="venue-capacity"
        type="number"
        min={1}
        max={2147483647}
        step={1}
        label="Capacity"
        {...register('capacity', { required: 'Enter capacity.' })}
        error={errors.capacity?.message}
      />
      <Field id="venue-address" label="Address (optional)" {...register('address')} />
      {error != null && <ErrorPanel error={error} />}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Create venue'}
      </Button>
    </form>
  );
}
