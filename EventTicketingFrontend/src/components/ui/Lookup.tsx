import { Field } from './Field';
import { Button } from './Button';
import { ErrorPanel } from './Feedback';
export function Lookup({
  id,
  label,
  value,
  onChange,
  search,
  onSearch,
  options,
  loading,
  error,
  more,
  loadMore,
  retry,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  search: string;
  onSearch: (value: string) => void;
  options: { id: number; name: string }[];
  loading: boolean;
  error: unknown;
  more: boolean;
  loadMore: () => void;
  retry: () => void;
}) {
  return (
    <div className="lookup">
      <Field
        id={`${id}-search`}
        label={`Search ${label.toLowerCase()}`}
        value={search}
        maxLength={200}
        onChange={(e) => onSearch(e.target.value)}
        autoComplete="off"
      />
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select {label.toLowerCase()}</option>
          {value && !options.some((o) => String(o.id) === value) && (
            <option value={value}>
              Selected {label.toLowerCase()} (ID {value})
            </option>
          )}
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      {loading && <small role="status">Loading choices…</small>}
      {error != null && <ErrorPanel error={error} retry={retry} />}
      {more && (
        <Button variant="secondary" onClick={loadMore} disabled={loading}>
          Load more {label.toLowerCase()}
        </Button>
      )}
    </div>
  );
}
