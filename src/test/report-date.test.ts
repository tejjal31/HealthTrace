import { beforeEach, describe, expect, it, vi } from "vitest";

const { from, updates } = vi.hoisted(() => ({ from: vi.fn(), updates: [] as { table: string; values: unknown; key: string; id: string }[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
import { saveReportDate } from "@/lib/data";

describe("report date edits", () => {
  beforeEach(() => {
    updates.length = 0;
    from.mockReset();
    from.mockImplementation((table: string) => ({
      update: (values: unknown) => ({
        eq: (key: string, id: string) => {
          updates.push({ table, values, key, id });
          return { error: null, select: () => ({ single: async () => ({ data: { id }, error: null }) }) };
        },
      }),
    }));
  });

  it("saves the chosen date on the report and its results", async () => {
    await saveReportDate("report-1", "2026-10-15");
    expect(updates).toEqual([
      { table: "reports", values: { report_date: "2026-10-15" }, key: "id", id: "report-1" },
      { table: "lab_results", values: { measured_on: "2026-10-15" }, key: "report_id", id: "report-1" },
    ]);
  });

  it("rejects impossible dates without writing", async () => {
    await expect(saveReportDate("report-1", "2026-02-30")).rejects.toThrow("Choose a valid report date");
    expect(from).not.toHaveBeenCalled();
  });
});