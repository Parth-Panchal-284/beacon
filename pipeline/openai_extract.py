"""OpenAI-backed evidence extraction for Beacon.

This is a build-time / backend pipeline component. Families never paste abstracts
into the product UI. The backend uses it to turn trusted biomedical source text
into structured evidence records that can be reviewed and added to the graph.
"""

from __future__ import annotations

import os
from typing import List, Literal, Optional

from openai import BadRequestError, NotFoundError, OpenAI
from pydantic import BaseModel, Field

Relation = Literal[
    "associated_with",
    "has_functional_effect",
    "has_phenotype",
    "shares_mechanism_with",
    "studied_in",
    "supports",
    "contradicts",
    "other",
]

EvidenceType = Literal[
    "human_cohort",
    "functional_study",
    "case_series",
    "clinical_study",
    "registry",
    "review",
    "database_record",
    "other",
]

FunctionalEffect = Literal[
    "gain_of_function",
    "loss_of_function",
    "mixed_function",
    "dominant_negative",
    "unknown",
]


class EvidenceClaim(BaseModel):
    subject: str = Field(description="Entity explicitly discussed in the text")
    relation: Relation
    object: str = Field(description="Entity or finding explicitly connected to the subject")
    evidence_type: EvidenceType
    functional_effect: Optional[FunctionalEffect] = None
    extraction_confidence: float = Field(
        ge=0,
        le=1,
        description="Confidence that the source text supports this extraction",
    )
    supporting_text: str = Field(description="Short supporting excerpt")
    uncertainty: str = Field(description="Important caveat or 'none stated'")


class EvidenceExtraction(BaseModel):
    claims: List[EvidenceClaim]
    summary: str = Field(description="Short summary of what the source contributes")


SYSTEM_PROMPT = """You extract evidence for a rare-disease research knowledge graph.

Rules:
- Extract only claims explicitly supported by the supplied source text.
- Do not add outside medical knowledge.
- Do not infer a treatment recommendation or treatment equivalence.
- Preserve uncertainty and contradictions.
- Prefer precise gene, disease, mechanism, phenotype, study, and functional-effect entities.
- Use 'unknown' rather than guessing functional effect.
- supporting_text must be a short excerpt from the supplied text.
- extraction_confidence is confidence in the extraction, not medical certainty.
- Return at most 6 high-signal claims.
"""


def _run(client: OpenAI, model: str, source_id: str, title: str, text: str):
    return client.responses.parse(
        model=model,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Source ID: {source_id}\n"
                    f"Title: {title or 'Untitled source'}\n\n"
                    "SOURCE TEXT:\n"
                    f"{text.strip()}"
                ),
            },
        ],
        text_format=EvidenceExtraction,
    )


def extract_evidence(*, source_id: str, title: str, text: str, model: Optional[str] = None) -> dict:
    if not source_id.strip():
        raise ValueError("source_id is required")
    if len(text.strip()) < 40:
        raise ValueError("source text is too short")

    client = OpenAI()
    selected_model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    try:
        response = _run(client, selected_model, source_id, title, text)
    except (NotFoundError, BadRequestError) as exc:
        message = str(exc)
        if "model" not in message.lower() or selected_model == "gpt-4o-mini":
            raise
        # Hackathon-friendly fallback for invalid/non-OpenAI model IDs such as
        # gpt-oss-120b configured in an older .env file.
        selected_model = "gpt-4o-mini"
        response = _run(client, selected_model, source_id, title, text)

    parsed = response.output_parsed
    if parsed is None:
        raise RuntimeError("OpenAI returned no parsed extraction")

    payload = parsed.model_dump()
    payload["source_id"] = source_id
    payload["title"] = title
    payload["model"] = selected_model

    for claim in payload["claims"]:
        claim["source_id"] = source_id
        claim["provenance"] = "openai_extracted"

    return payload
