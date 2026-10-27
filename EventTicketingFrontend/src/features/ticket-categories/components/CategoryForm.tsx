import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Field } from '../../../components/ui/Field';
import { Button } from '../../../components/ui/Button';
import { ErrorPanel } from '../../../components/ui/Feedback';
import { vault } from '../../../lib/auth/session-vault';
import { useCreateCategory, useUpdateCategory } from '../mutations';
import { categoryBody } from '../validation';
import type { CategoryValues } from '../validation';
import type { CategoryDto } from '../types';
export function CategoryForm({
  eventId,
  existing,
  onSaved,
}: {
  eventId: number;
  existing?: CategoryDto;
  onSaved: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryValues>({
    defaultValues: {
      name: existing?.name ?? '',
      description: existing?.description ?? '',
      price: existing?.price ?? '',
      capacity: existing ? String(existing.capacity) : '',
      eventId: String(existing?.eventId ?? eventId),
    },
  });
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const [error, setError] = useState<unknown>();
  return (
    <form
      className="form-stack"
      onSubmit={handleSubmit(async (values) => {
        const generation = vault.generation();
        setError(undefined);
        try {
          const body = categoryBody(values);
          if (existing)
            await update.mutateAsync({ id: existing.id, body, oldEventId: existing.eventId });
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
        id={`category-name-${existing?.id ?? 'new'}`}
        label="Category name"
        {...register('name', { required: 'Enter a category name.' })}
        error={errors.name?.message}
      />
      <div className="field">
        <label htmlFor={`category-description-${existing?.id ?? 'new'}`}>
          Description (optional)
        </label>
        <textarea
          id={`category-description-${existing?.id ?? 'new'}`}
          {...register('description')}
        />
      </div>
      <Field
        id={`category-price-${existing?.id ?? 'new'}`}
        label="Unit price (USD)"
        inputMode="decimal"
        hint="0 is free. At most two decimal places; maximum 9999999999999999.99."
        {...register('price', { required: 'Enter a price, including 0 for free tickets.' })}
        error={errors.price?.message}
      />
      <Field
        id={`category-capacity-${existing?.id ?? 'new'}`}
        label="Allocated capacity"
        type="number"
        min={1}
        max={2147483647}
        step={1}
        {...register('capacity', { required: 'Enter capacity.' })}
        error={errors.capacity?.message}
      />
      <Field
        id={`category-event-${existing?.id ?? 'new'}`}
        label="Event ID"
        type="number"
        min={1}
        max={2147483647}
        step={1}
        hint="Moving requires access to both events and no booking history."
        {...register('eventId', { required: 'Enter the destination event ID.' })}
        error={errors.eventId?.message}
      />
      {error != null && <ErrorPanel error={error} />}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : existing ? 'Save category' : 'Create category'}
      </Button>
    </form>
  );
}
