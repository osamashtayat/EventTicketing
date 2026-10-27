import { CreateAccountForm } from '../../../features/accounts/public';
export default function AccountCreatePage() {
  return (
    <div className="reading">
      <p className="eyebrow">ADMINISTRATION</p>
      <h1 tabIndex={-1}>Create an account</h1>
      <p>Create a new organizer or administrator. Existing accounts cannot be promoted here.</p>
      <div className="panel">
        <CreateAccountForm />
      </div>
    </div>
  );
}
