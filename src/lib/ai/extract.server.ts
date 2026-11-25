
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";

const MODEL = "qwen/qwen3.8-27b";

export const extractionSchema = z.object({
  is_medical_report: z.boolean(),
  report_date: z.string().nullable(),
  lab_name: z.string().nullable(),
  tests: z.array(
    z.object({
      test_name: z.string(),
      value_text: z.string(),
      value_num: z.number().nullable(),
      unit: z.string().nullable(),
      ref_low: z.number().nullable(),
      ref_high: z.number().nullable(),
      ref_text: z.string().nullable(),
      flag: z.enum(["low", "normal", "high", "unknown"]),
    }),
  ),
  issues: z.array(z.string()),
  summary_en: z.string(),
  summary_hi: z.string(),
});

export type Extraction = z.infer<typeof extractionSchema>;

const INSTRUCTIONS = `
You are a medical laboratory report information extraction system.

Extract only information explicitly visible in the supplied report text.

Rules:
- Never invent or guess test values, units, dates or reference ranges.
- Use null when information is missing.
- Preserve the original printed value in value_text.
- Compare numeric values only with the printed reference range.
- Use low, normal, high or unknown for flag.
- Report missing or unreadable information in issues.
- Do not diagnose or prescribe treatment.
- Write a simple English summary (maximum 120 words).
- Write the equivalent summary in simple Hindi (Devanagari).
- If the text is not a medical report, set is_medical_report=false
  and return an empty tests array.
`;


async function extractPdfText(file: ArrayBuffer): Promise<string> {
  // Load PDF.js at runtime so Nitro does not bundle away its worker file.
  const { getDocument } = await import(
    /* @vite-ignore */ "pdfjs-dist/legacy/build/pdf.mjs"
  );

  const pdf = await getDocument({
    data: new Uint8Array(file),
  }).promise;

  const pages: string[] = [];

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    pages.push(pageText);
  }

  return pages.join("\n").replace(/\s+/g, " ").trim();
}

export async function extractReport(
  file: ArrayBuffer,
  mime: string,
  filename: string,
): Promise<Extraction> {
  if (mime !== "application/pdf") {
    throw new Error("Currently, NLP extraction supports PDF reports only.");
  }

  const apiKey = process.env["GROQ_API_KEY"];

  if (!apiKey) {
    throw new Error("Groq API is not configured.");
  }

  const reportText = await extractPdfText(file);

  if (!reportText) {
    throw new Error(
      "No selectable text found in this PDF. OCR is required for scanned reports.",
    );
  }

  const provider = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });

  try {
    const result = await generateText({
      model: provider.chat(MODEL),
      system: INSTRUCTIONS,
      output: Output.object({
        schema: extractionSchema,
      }),
      providerOptions: {
        openai: {
          strictJsonSchema: true,
        },
      },
      prompt: `
        Filename: ${filename}

        Extract every medical test result from this report:

        ${reportText}
      `,
    });

    return result.output;
  } catch (error) {
    const details = error as {
      statusCode?: number;
      message?: string;
      responseBody?: string;
    };

    console.error("Groq error details:", {
      statusCode: details.statusCode,
      message: details.message,
      responseBody: details.responseBody,
    });

    throw new Error(
      "Groq could not process this report. Please try again.",
    );
  }
}
