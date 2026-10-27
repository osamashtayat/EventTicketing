import { useState } from 'react';
import type { ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Field } from '../../../components/ui/Field';
import { Button } from '../../../components/ui/Button';
import { ErrorPanel } from '../../../components/ui/Feedback';
import { utcInput } from '../../../utils/date-time';
import { vault } from '../../../lib/auth/session-vault';
import { useCreateEvent, useUpdateEvent } from '../mutations';
import { eventBody } from '../validation';
import type { EventValues } from '../validation';
import type { EventDto } from '../types';
export function EventForm({
  existing,
  venueChoice,
  onSaved,
}: {
  existing?: EventDto;
  venueChoice: (value: string, onChange: (value: string) => void) => ReactNode;
  onSaved: (event: EventDto) => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventValues>({
    defaultValues: {
      name: existing?.name ?? '',
      description: existing?.description ?? '',
      startDate: existing ? utcInput(existing.startDate) : '',
      endDate: existing ? utcInput(existing.endDate) : '',
      capacity: existing ? String(existing.capacity) : '',
      venueId: existing ? String(existing.venueId) : '',
    },
  });
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const [error, setError] = useState<unknown>();
  return (
    <form
      className="form-stack"
      onSubmit={handleSubmit(async (values) => {
        const generation = vault.generation();
        setError(undefined);
        try {
          const body = eventBody(values);
          const event = existing
            ? await update.mutateAsync({ id: existing.id, body })
            : await create.mutateAsync(body);
          if (generation === vault.generation()) onSaved(event);
        } catch (e) {
          setError(e);
        }
      })}
    >
      <p className="muted">
        Events are public immediately after creation. Dates below are entered in UTC. The server
        checks venue capacity and history restrictions.
      </p>
      <Field
        id="event-name"
        label="Event name"
        {...register('name', { required: 'Enter an event name.' })}
        error={errors.name?.message}
      />
      <div className="field">
        <label htmlFor="event-description">Description (optional, plain text)</label>
        <textarea id="event-description" {...register('description')} />
      </div>
      <div className="two-columns">
        <Field
          id="event-start"
          label="Start date and time (UTC)"
          type="datetime-local"
          step="0.001"
          {...register('startDate', { required: 'Enter a start date.' })}
          error={errors.startDate?.message}
        />
        <Field
          id="event-end"
          label="End date and time (UTC)"
          type="datetime-local"
          step="0.001"
          {...register('endDate', { required: 'Enter an end date.' })}
          error={errors.endDate?.message}
        />
      </div>
      <Field
        id="event-capacity"
        label="Event capacity"
        type="number"
        min={1}
        max={2147483647}
        step={1}
        {...register('capacity', { required: 'Enter capacity.' })}
        error={errors.capacity?.message}
      />
      <Controller
        control={control}
        name="venueId"
        render={({ field }) => <>{venueChoice(field.value, field.onChange)}</>}
      />
      {existing && (
        <p className="muted text-sm">
          Booking history prevents date or venue changes and deletion. Names and descriptions can
          still be edited.
        </p>
      )}
      {error != null && <ErrorPanel error={error} />}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : existing ? 'Save event' : 'Create public event'}
      </Button>
    </form>
  );
}
