import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoOutputGeneratedError } from "ai";

const mocks = vi.hoisted(() => ({ streamText: vi.fn() }));
vi.mock("ai", async (importOriginal) => ({ ...await importOriginal<typeof import("ai")>(), streamText: mocks.streamText }));
import { askAboutTest } from "@/lib/ai/ask.server";

describe("Ask About Tests errors", () => {
  beforeEach(() => {
    vi.stubEnv("GROQ_API_KEY", "test-only-key");
    mocks.streamText.mockReset();
  });
  it("shows the original credit error instead of the SDK no-output error", async () => {
    mocks.streamText.mockImplementation((options) => {
      options.onError?.({ error: { statusCode: 402, responseBody: JSON.stringify({ message: "Insufficient AI credits. Add credits to continue." }) } });
      return { get output() { return Promise.reject(new NoOutputGeneratedError()); } };
    });
    await expect(askAboutTest("What are Basophils?", "")).rejects.toThrow("Insufficient AI credits. Add credits to continue.");
    expect(mocks.streamText).toHaveBeenCalledTimes(1);
  });
  it("preserves an access denial without retrying or asking for rephrasing", async () => {
    mocks.streamText.mockImplementation((options) => {
      options.onError?.({ error: { statusCode: 403, responseBody: JSON.stringify({ error: { message: "AI access disabled by your workspace admin." } }) } });
      return { get output() { return Promise.reject(new NoOutputGeneratedError()); } };
    });
    await expect(askAboutTest("What is TSH?", "")).rejects.toThrow("AI access disabled by your workspace admin.");
    expect(mocks.streamText).toHaveBeenCalledTimes(1);
  });
  it("returns a usable structured answer unchanged", async () => {
    const answer = { is_health_question: true, title: "Basophils", simple_explanation: "A type of white blood cell.", normal_range: null, high_reasons: [], low_reasons: [], your_results: null, when_to_see_doctor: "Discuss abnormal results with your doctor." };
    mocks.streamText.mockReturnValue({ output: Promise.resolve(answer) });
    await expect(askAboutTest("What are Basophils?", "")).resolves.toEqual(answer);
  });
});