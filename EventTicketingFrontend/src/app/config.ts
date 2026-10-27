export function parseConfig(value: unknown, production = false): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(
      'Set VITE_API_BASE_URL to your API origin. See .env.example, then restart the development server.',
    );
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('VITE_API_BASE_URL must be a valid HTTP or HTTPS origin.');
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    (production && url.protocol !== 'https:')
  )
    throw new Error(
      'VITE_API_BASE_URL must be an origin without credentials, path or query. Production requires HTTPS.',
    );
  return url.origin;
}
