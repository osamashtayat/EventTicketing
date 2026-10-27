export class ApiError extends Error {
  constructor(
    public readonly kind: 'transport' | 'http' | 'contract',
    message: string,
    public readonly status?: number,
    public readonly traceId?: string,
    public readonly issues: { code: string; description: string }[] = [],
    public readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function httpError(status: number, body: unknown): ApiError {
  const fallback =
    status === 401
      ? 'Please sign in to continue.'
      : status === 403
        ? 'You do not have permission for this action.'
        : status === 404
          ? 'This resource is missing or unavailable to your account.'
          : status === 409
            ? 'This action conflicts with the current data. Refresh and review your input.'
            : status >= 500
              ? 'The service could not complete this request.'
              : 'Please review your input and try again.';
  const data = isRecord(body) ? body : {};
  const issues: { code: string; description: string }[] = [];
  const fields: Record<string, string[]> = {};
  if (Array.isArray(data.errors))
    for (const item of data.errors) {
      if (isRecord(item) && typeof item.code === 'string' && typeof item.description === 'string')
        issues.push({ code: item.code, description: item.description });
    }
  else if (isRecord(data.errors))
    for (const [key, messages] of Object.entries(data.errors)) {
      if (Array.isArray(messages))
        fields[key] = messages.filter((v): v is string => typeof v === 'string');
    }
  const message =
    status >= 500
      ? fallback
      : (issues[0]?.description ?? (typeof data.detail === 'string' ? data.detail : fallback));
  return new ApiError(
    'http',
    message,
    status,
    typeof data.traceId === 'string' ? data.traceId : undefined,
    issues,
    fields,
  );
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
