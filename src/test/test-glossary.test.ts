import { describe, expect, it } from "vitest";
import { glossaryAnswer, lookupGlossary } from "@/lib/testGlossary";

describe("built-in test library", () => {
  it("answers 'What are Basophils?'", () => {
    expect(lookupGlossary("What are Basophils?")?.title).toBe("Basophils");
  });
  it("matches TSH, HbA1c and ESR example questions", () => {
    expect(lookupGlossary("What does high TSH mean?")?.title).toContain("TSH");
    expect(lookupGlossary("What is HbA1c?")?.title).toBe("HbA1c");
    expect(lookupGlossary("What is ESR?")?.title).toBe("ESR");
    expect(lookupGlossary("Is my hemoglobin normal?")?.title).toBe("Hemoglobin");
  });
  it("answers hormone questions like FSH, LH, AMH and Prolactin", () => {
    expect(lookupGlossary("Fsh")?.title).toContain("FSH");
    expect(lookupGlossary("what is LH?")?.title).toContain("LH");
    expect(lookupGlossary("AMH level")?.title).toContain("AMH");
    expect(lookupGlossary("high prolactin")?.title).toBe("Prolactin");
  });
  it("returns nothing for unknown questions", () => {
    expect(glossaryAnswer("What is the capital of France?", null)).toBeUndefined();
  });
  it("includes the user's own result summary", () => {
    expect(glossaryAnswer("What is TSH?", "Your latest TSH was 5.2")?.your_results).toBe("Your latest TSH was 5.2");
  });
});
