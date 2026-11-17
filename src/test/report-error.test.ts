import { describe, expect, it } from "vitest";
import { friendlyReportError, REPORT_RETRY_MESSAGE } from "@/lib/reportError";

describe("report error messages shown to people", () => {
  it("hides credit messages", () => {
    expect(friendlyReportError("AI credits are used up, so reports can't be read right now. Please add credits and tap Retry.")).toBe(REPORT_RETRY_MESSAGE);
    expect(friendlyReportError("Not enough credits")).toBe(REPORT_RETRY_MESSAGE);
  });
  it("hides technical stream errors", () => {
    expect(friendlyReportError("No output generated. Check the stream for errors.")).toBe(REPORT_RETRY_MESSAGE);
    expect(friendlyReportError(null)).toBe(REPORT_RETRY_MESSAGE);
  });
  it("keeps the not-a-lab-report message", () => {
    expect(friendlyReportError("This doesn't look like a medical lab report.")).toBe("This doesn't look like a medical lab report.");
  });
});
