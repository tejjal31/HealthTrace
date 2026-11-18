const MAX_SERIALIZED_LENGTH = 2000;

function describeThrown(error: unknown): string {
  if (error instanceof Response) {
    return `Response ${error.status}`;
  }

  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  const { message } = (error ?? {}) as { message?: unknown };

  if (typeof message === "string" && message.length > 0) {
    return message;
  }

  try {
    return JSON.stringify(error)?.slice(0, MAX_SERIALIZED_LENGTH) ?? String(error);
  } catch {
    return String(error);
  }
}

export function reportAppError(
  error: unknown,
  context: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;

  console.error("[HealthTrace] Application error:", {
    message: describeThrown(error),
    route: window.location.pathname,
    ...context,
  });
}
