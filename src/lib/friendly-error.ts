// Maps backend/Supabase errors to safe, user-friendly messages.
// Keep raw details in console.error only — never surface schema, constraint,
// or PostgreSQL internals to end users.

type AnyError = {
  message?: string;
  code?: string | number;
  status?: number;
  name?: string;
} | null | undefined | unknown;

export function friendlyError(err: AnyError, fallback = "Something went wrong. Please try again."): string {
  // Always log the raw error for developers
  // eslint-disable-next-line no-console
  console.error("[app error]", err);

  if (!err) return fallback;
  const e = err as { code?: string | number; message?: string; status?: number; name?: string };
  const code = String(e.code ?? "");
  const msg = String(e.message ?? "").toLowerCase();

  // Auth-specific
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
    return "Invalid email or password.";
  }
  if (msg.includes("email not confirmed")) return "Please confirm your email to continue.";
  if (msg.includes("rate limit") || e.status === 429) return "Too many requests. Please wait a moment and try again.";
  if (msg.includes("network") || msg.includes("failed to fetch")) {
    return "Network error. Check your connection and try again.";
  }

  // PostgreSQL error codes (Supabase forwards these)
  switch (code) {
    case "23505":
      return "This record already exists.";
    case "23503":
      return "This action conflicts with related records.";
    case "23502":
      return "A required field is missing.";
    case "23514":
      return "The provided value is not allowed.";
    case "22001":
      return "One of the values is too long.";
    case "42501":
    case "PGRST301":
      return "You don't have permission to perform this action.";
    case "PGRST116":
      return "Record not found.";
  }

  if (e.status && e.status >= 500) return "Server error. Please try again shortly.";
  if (e.status === 401 || e.status === 403) return "You don't have permission to perform this action.";
  if (e.status === 404) return "Record not found.";

  return fallback;
}
