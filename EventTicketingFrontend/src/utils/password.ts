export const passwordHint =
  'At least 6 characters with uppercase, lowercase, a digit and a symbol.';
export function validatePassword(value: string): true | string {
  return (
    (value.length >= 6 &&
      /[a-z]/.test(value) &&
      /[A-Z]/.test(value) &&
      /\d/.test(value) &&
      /[^a-zA-Z0-9]/.test(value)) ||
    passwordHint
  );
}
