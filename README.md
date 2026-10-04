# Beacon

### *A path forward*

A rare diagnosis can leave a family with more questions than answers. Beacon helps families understand what is known, discover related conditions that may share important biology, and see which research or treatment paths may be worth exploring next.

## Find the closest research paths for a rare diagnosis

Search for a diagnosis and Beacon turns a complex research landscape into three simple steps:

### 1. Understand the diagnosis
See a clear overview of the condition, the gene or pathway involved, and where research currently stands.

### 2. Discover related diseases
Beacon finds conditions that may share the same underlying mechanism, symptoms, or disease course — even when the disease names are completely different.

Each match includes a simple score and explanation so families can understand **why the connection matters**.

### 3. Explore a possible treatment path
For the strongest matches, Beacon highlights treatment strategies that have been studied in related diseases and shows:

- what may be relevant to your diagnosis,
- how strong the supporting evidence is,
- what may not transfer between the two conditions, and
- what should be reviewed with a medical or research expert.

## Why Beacon

Rare-disease research is often scattered across papers, registries, clinical studies, and separate patient communities. Families should not have to become biomedical researchers just to understand what might come next.

Beacon connects that information into a path that is easier to follow:

**Diagnosis → Related disease → Evidence → Possible treatment path**

## Evidence you can inspect

Every connection in Beacon can be traced back to the evidence behind it. Families can open the evidence path to see why two diseases were matched and what supports a suggested research direction.

Beacon is designed to make complex research understandable without hiding uncertainty. When a connection is weak, incomplete, or needs expert validation, Beacon makes that clear.

## Built for families who are searching for what comes next

A rare diagnosis may be uncommon. The biology behind it may not be.

Beacon helps families find the research, communities, and possibilities that could already be closer than they appear.

## Run locally

Python 3.9+ is supported.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Put your OpenAI API key in `.env`:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Then run:

```bash
python server.py
```

Open `http://127.0.0.1:8000` in your browser.
