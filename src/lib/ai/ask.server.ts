
import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, generateText } from "ai";
import { z } from "zod";

export const answerSchema = z.object({
  is_health_question: z.boolean(),
  title: z.string(),
  simple_explanation: z.string(),
  normal_range: z.string().nullable(),
  high_reasons: z.array(z.string()),
  low_reasons: z.array(z.string()),
  your_results: z.string().nullable(),
  when_to_see_doctor: z.string(),
});

export type AskAnswer = z.infer<typeof answerSchema>;

const INSTRUCTIONS = `
You are HealthTrace, an AI medical terminology and laboratory test
explanation assistant powered by a deep-learning language model.

Your task:
- Explain medical terms, diseases, blood tests and abbreviations.
- Understand common names, alternative spellings and synonyms.
- Recognize terms such as PCOD, PCOS, HbA1c, TSH, CBC and ESR.
- Explain unfamiliar but valid medical terms using your medical knowledge.
- Use simple English that a 14-year-old can understand.
- Give typical adult normal ranges with units where applicable.
- Mention that reference ranges vary between laboratories.
- Explain common reasons for high and low results.
- Use actual user results only when provided. Never invent values.
- Never diagnose or prescribe medicines.
- Encourage users to consult a qualified doctor.
- For non-health questions, set is_health_question to false.
- Return every field in the required JSON structure.
- Use empty arrays when no reasons apply.
- Use null when a value is unavailable.
`;

export async function askAboutTest(
  question: string,
  context: string
): Promise<AskAnswer> {
  const apiKey = process.env["GROQ_API_KEY"];

  if (!apiKey) {
    throw new Error("Groq API is not configured.");
  }

  const provider = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });

  try {
    const result = await generateText({
      model: provider.chat("openai/gpt-oss-20b"),
      system: INSTRUCTIONS,
      output: Output.object({
        schema: answerSchema,
      }),
      providerOptions: {
        openai: {
          strictJsonSchema: true,
        },
      },
      prompt: `
Question: ${question}

User's own lab results:
${context || "No personal lab results provided."}

Explain the question even if it is not in a predefined glossary.
Do not return an empty explanation for a recognized medical term.
`,
    });

    return result.output;
  } catch (error) {
    console.error(
      "Groq Ask API error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    if (NoObjectGeneratedError.isInstance(error)) {
      throw new Error("AI could not generate a valid answer. Please try again.");
    }

    throw new Error("AI could not complete this request. Please try again.");
  }
}
