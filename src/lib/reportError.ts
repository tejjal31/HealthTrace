/** Messages we wrote for people; anything else is treated as technical and replaced. */
const SAFE = [
  "This doesn't look like a medical lab report.",
  "Could not read the uploaded file",
  "Too many requests right now. Please try again in a minute.",
  "The AI could not read this report clearly.",
];

export const REPORT_RETRY_MESSAGE = "We couldn't read this report just now. Your file is saved — please tap Retry a little later.";

/** Turn a stored report error into a friendly message that never mentions credits or internals. */
export function friendlyReportError(error: string | null | undefined): string {
  const msg = (error ?? "").trim();
  if (msg && SAFE.some((s) => msg.startsWith(s))) return msg;
  return REPORT_RETRY_MESSAGE;
}
