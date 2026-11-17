<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Report date edits use the shared data-layer save helper to update both the report and its lab-result dates, keeping trends and timelines aligned.
- Custom journal issues keep their name as the first segment of notes, followed by optional notes separated by an em dash; existing reading fields store optional readings without a separate schema.
- Ask About Tests captures SDK stream errors before consuming structured output so upstream credit and access errors are not hidden by a no-output error.

- Ask About Tests falls back to the built-in glossary in src/lib/testGlossary.ts when the AI call fails, so common test questions still get answers during credit or access outages; AI failure reasons are logged server-side only and never shown to end users.
- Report errors shown to people go through src/lib/reportError.ts so credit/stream details stored in the database never reach end users.
