import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const analyzeReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reportId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: report, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", data.reportId)
      .single();
    if (error || !report) throw new Error("Report not found");

    await supabase.from("reports").update({ status: "processing", error: null }).eq("id", report.id);
    try {
      const { data: blob, error: dlErr } = await supabase.storage.from("reports").download(report.file_path);
      if (dlErr || !blob) throw new Error("Could not read the uploaded file");
      const { extractReport } = await import("./ai/extract.server");
      const x = await extractReport(await blob.arrayBuffer(), report.mime_type, report.title);

      if (!x.is_medical_report) {
        await supabase
          .from("reports")
          .update({ status: "error", error: "This doesn't look like a medical lab report." })
          .eq("id", report.id);
        return { ok: false };
      }
      const date = x.report_date && /^\d{4}-\d{2}-\d{2}$/.test(x.report_date) ? x.report_date : null;
      const issues = [...x.issues];
      if (!date) issues.push("No report date found on the document.");
      await supabase.from("lab_results").delete().eq("report_id", report.id);
      if (x.tests.length) {
        const { error: insErr } = await supabase.from("lab_results").insert(
          x.tests.map((t) => ({
            user_id: userId,
            report_id: report.id,
            test_name: t.test_name.trim(),
            value_text: t.value_text,
            value_num: t.value_num,
            unit: t.unit,
            ref_low: t.ref_low,
            ref_high: t.ref_high,
            ref_text: t.ref_text,
            flag: ["low", "normal", "high"].includes(t.flag) ? t.flag : "unknown",
            measured_on: date,
          })),
        );
        if (insErr) throw new Error(insErr.message);
      }
      await supabase
        .from("reports")
        .update({
          status: "done",
          report_date: date,
          lab_name: x.lab_name,
          summary_en: x.summary_en,
          summary_hi: x.summary_hi,
          issues,
        })
        .eq("id", report.id);
      return { ok: true, count: x.tests.length };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      await supabase.from("reports").update({ status: "error", error: msg }).eq("id", report.id);
      throw new Error(msg);
    }
  });
