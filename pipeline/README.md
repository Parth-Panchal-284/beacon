# OpenAI evidence pipeline

Beacon uses OpenAI for a narrow, auditable step:

`research source -> Structured Output -> source-bound graph claims`

The live endpoint is `POST /api/extract` in `server.py`. It calls `extract_evidence()` from `openai_extract.py`.

OpenAI does **not** calculate Research Match. The match score remains deterministic application logic over mechanism, phenotype, functional-effect, and disease-course features.

The extractor is intentionally conservative:

- claims must be explicitly supported by the supplied text;
- provenance IDs are attached server-side;
- extraction confidence is not treated as evidence strength;
- no treatment recommendations or cross-disease treatment transfer are allowed;
- ambiguous evidence must retain an uncertainty note.
