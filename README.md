# Beacon

Beacon helps families and rare-disease communities move from a diagnosis to:

1. a simple overview of the disease,
2. ranked related-disease research matches,
3. an evidence-backed treatment research path worth expert review.

The demo currently supports:

- `SCN2A-related epilepsy`
- `Noonan syndrome`

## Product flow

### 1. Overview
Shows the diagnosis in plain language, three high-signal facts, and the current research picture.

### 2. Matches
Ranks 2-3 related diseases using a transparent Research Match score:

- 35% mechanism similarity
- 30% symptom similarity
- 20% variant-effect compatibility
- 15% disease-course similarity

The score is a research-prioritization heuristic, not a clinical probability.

### 3. Treatment path
For the strongest related-disease match, Beacon shows one treatment strategy worth investigating, a research-transfer confidence score, what may carry over, and what must be re-checked by experts.

For SCN2A, the demo path is a sodium-channel-blocking strategy for gain-of-function disease. It is backed by independent evidence in SCN2A and SCN8A and is explicitly gated on variant function.

## OpenAI's role

OpenAI is used behind the scenes, not as a parent-facing abstract input box.

The evidence pipeline does this:

`trusted paper / database text -> OpenAI Structured Output -> source-bound graph claim -> human review -> graph dataset`

OpenAI extracts structured entities and claims such as:

- gene
- functional effect
- phenotype
- mechanism
- study type
- uncertainty
- supporting text

The deterministic application code then calculates Research Match scores and renders the product. OpenAI does not directly decide that a treatment will work.

## Run locally

Python 3.9+ is supported.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Put your OpenAI API key in `.env`:

```text
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Then:

```bash
python server.py
```

Open:

```text
http://127.0.0.1:8000
```

## Model error fix

If an old `.env` contains:

```text
OPENAI_MODEL=gpt-oss-120b
```

replace it with:

```text
OPENAI_MODEL=gpt-4o-mini
```

`gpt-oss-120b` is not an OpenAI API model ID on this endpoint. The extraction code also falls back to `gpt-4o-mini` when it encounters an invalid configured model.

## Main files

- `index.html` — product UI
- `styles.css` — product styling
- `app.js` — deterministic product logic
- `data/cases.json` — demo diagnosis, match, and treatment-path data
- `data/sources.json` — evidence metadata
- `pipeline/openai_extract.py` — OpenAI Structured Outputs extraction
- `server.py` — local Flask server

## Demo recommendation

Use `SCN2A-related epilepsy` for the main demo. It gives the strongest 30-second reveal:

- SCN8A ranks above Dravet syndrome despite both being sodium-channel epilepsies.
- The ranking explains the mechanism difference.
- The product then surfaces a treatment-class research path that is plausible for SCN2A gain-of-function disease but explicitly not transferable to loss-of-function disease.

Use `Noonan syndrome` as the backup search to show that the product generalizes beyond epilepsy.
