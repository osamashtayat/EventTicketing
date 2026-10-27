import { useNavigate } from 'react-router';
import { EventForm } from '../../../features/events/public';
import { VenueSelect } from '../../../features/venues/public';
export default function EventCreatePage() {
  const navigate = useNavigate();
  return (
    <div className="reading">
      <p className="eyebrow">BRING PEOPLE TOGETHER</p>
      <h1 tabIndex={-1}>Create an event</h1>
      <div className="panel">
        <EventForm
          venueChoice={(value, onChange) => (
            <VenueSelect value={value} onChange={onChange} id="event-form-venue" />
          )}
          onSaved={() => navigate('/events')}
        />
      </div>
    </div>
  );
}
