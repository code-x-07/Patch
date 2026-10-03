# Individual AI learning sessions

The new `/learn` route turns a PDF or pasted lecture notes into an individual study session. `/demo` retains its bundled algebra content, scripted classmates and offline flow. The master prompt was used as product context; no deployment or real-class infrastructure was added.

## Local setup

1. Replace the placeholder for `GEMINI_API_KEY` in the project's `.env` file with your key.
2. Restart `npm run dev` after editing the environment file.
3. Open `/learn`, upload the original Week 8 PDF or paste notes, set the student level and optionally choose an objective.
4. Generate, inspect the objective and map, confirm the review checkbox and start the quiz.

The API key exists only on the server. `.env` is ignored by Git. The default model is `gemini-3.5-flash`; override `GEMINI_MODEL` with an available compatible model if necessary. Integration follows Google's [structured-output documentation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output) and [GenerateContent reference](https://ai.google.dev/api/generate-content). There is no provider SDK dependency.

## What is implemented

- One PDF up to 12 MB, or 100–60,000 characters of pasted text. PDF bytes go directly to Gemini so figures and scanned slides can be interpreted.
- College/undergraduate default, editable level, optional objective chosen automatically when blank.
- One focused objective, a dynamic map of 4–7 skills, lesson per skill, source references and supporting excerpts. Added foundations and proposed prerequisite links are labelled.
- A structured course bank: four diagnostic, three repair-check and one bridge question per skill, plus four target Boss Fight variants. Eight quiz questions sample every skill. Validators require fresh diagnostic coverage after the quiz.
- Separate AI content-review request against the original source, with one automatic revision pass if structure or review fails. Rejected or incomplete generation does not start a session. Structural checks reject cycles, missing references, duplicate content, invalid answer counts and insufficient variant coverage.
- Review preview, eight-question quiz, Sure/Guess, misconception feedback, report, adaptive diagnosis, evidence panel, disputed diagnosis with fresh checks, short lesson, root practice, bridge questions, two independent target confirmations, result and interactive Knowledge Map.
- Failed repair checks and incorrect/guessed target confirmations cannot produce a completion claim. Other gaps retain their own status after a target pass.
- Cancel, error recovery, new-notes action and session restart. Refreshing clears the content and attempts.
- Compact paraphrased Software Testing Week 8 text example. This is input material; it still requires Gemini and is never presented as generated output. Upload the original PDF to include its figures.

## Architecture

`app/api/learning/generate/route.ts` bounds the request, checks the PDF signature, enforces same-origin requests and prevents concurrent generation within this local process. `lib/learning/gemini.ts` calls Gemini with structured output and then requests an independent content-review pass. User notes and generated drafts are treated as reference data, never instructions. Provider credentials and raw provider errors are not sent to the browser.

`lib/learning/schema.ts` checks the graph and question bank, then adapts the generated course to the shared engine. The existing engine accepts an optional content bank; its default remains the demo content. Generated-session probes use only diagnostic variants so they cannot consume repair checks. Generated questions carry an explicit `conceptual` rationale rather than pretending to have the demo's machine-verified algebra formulas.

The provider schema describes the response shape without large string/array bounds, which can fail Gemini's grammar compilation. All bounds are still enforced locally with Zod. REST `responseFormat.text.mimeType` uses `APPLICATION_JSON`, as specified in the API reference. Gemini 3 requests use low thinking overhead. Temporary 500/502/503 failures are retried twice within each call's deadline; quota failures are not retried. A session can involve up to two generation and two review passes and may take several minutes.

`lib/learning/session.ts` runs the new session state machine. It keeps answer evaluation, confidence evidence, root-gap routing and progress deterministic after content generation. Two distinct correct-and-sure answers establish direct knowledge; two distinct failures establish a gap. Target confirmation also needs two consecutive correct-and-sure answers on unseen variants. This flow does not call Gemini while the student answers.

## Boundaries

This is personal study, not assessed or competitive Live Mode. The generated bank, including answer keys, is in browser memory. There are no accounts, saved classes, join codes, persistence, real teacher analytics or long-term retention checks. Student answers remain in the browser; original notes are sent to Google for generation and review. Patch does not save uploaded files or log their contents. Google's handling of requests depends on the API project's terms/settings.

Structural validation and a second AI review cannot prove educational correctness or citation fidelity. Source references and prerequisite links remain reviewable proposals. A displayed root gap means the evidence supports that node within the proposed graph; it is not a proven causal diagnosis. The mission addresses the highest-ranked supported gap; other gaps remain visible.

The generation endpoint is intended for this local MVP. It needs authenticated access and persistent usage controls before public hosting with a shared paid key. The in-process concurrency guard is not distributed rate limiting.

## Verification

Unit tests cover invalid generated graphs and banks, content isolation, the full learning loop, reserved repair variants, uncertain diagnosis, failed practice, incorrect/guessed confirmation, PDF request format, missing keys, rejected content reviews and quota errors. Gemini responses are mocked in these tests.

Browser tests in `e2e/learning.spec.ts` use a synthetic course response, not a fabricated live Gemini result. They cover upload, preview, trace, repair, transfer, map, restart, recoverable errors, original-demo links, 375px overflow and axe checks. Screenshots are under `artifacts/screenshots/learning-*`.

Live generation from the supplied 43-page, approximately 11 MB Week 8 PDF succeeded on 4 October 2026 after correcting REST MIME settings and simplifying the provider schema. The returned course, "White-Box Statement and Branch Coverage Analysis", contains four connected skills and 36 questions and passed structural validation and the AI content review. The request completed in approximately 2.2 minutes. This confirms the actual provider integration, not educational correctness for every generated question.

Verified locally on 4 October 2026: production build and ESLint passed; all 156 unit tests passed; all 9 selected browser tests passed against the production server. The browser run included the new mobile learning loop, desktop preview and keyboard answer, real endpoint rejection checks, and the original demo's offline loop, 375px layouts, reduced motion and keyboard/Present mode. New learning screens checked by axe had zero violations. Mobile and laptop screenshots were inspected. Gemini response content was mocked; no live provider outcome is claimed.

After the live integration fixes: 160 unit tests and all six learning browser tests passed, including a new regression for non-overlapping branches on mobile. The actual returned Gemini course also completed preview → quiz → diagnosis → repair → transfer in a mobile browser, replaying the saved provider response to avoid another paid generation request. Its preview and result screenshots are `learning-live-preview.png` and `learning-live-result.png`. This confirms the generated bank is usable by the app; the answers selected in this automated run are test inputs, not a real student's learning outcome.
