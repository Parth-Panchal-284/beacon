"""CLI smoke test for the OpenAI evidence extractor.

Example:
    python pipeline/extract_claims.py \
      --source-id PMID:12345678 \
      --title "Example paper" \
      --text-file abstract.txt
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from dotenv import load_dotenv

from openai_extract import extract_evidence


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-id", required=True)
    parser.add_argument("--title", default="")
    parser.add_argument("--text-file", required=True)
    parser.add_argument("--output", default="")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parents[1]
    load_dotenv(project_root / ".env")

    text = Path(args.text_file).read_text(encoding="utf-8")
    result = extract_evidence(
        source_id=args.source_id,
        title=args.title,
        text=text,
    )
    rendered = json.dumps(result, indent=2, ensure_ascii=False)

    if args.output:
        Path(args.output).write_text(rendered + "\n", encoding="utf-8")
        print(f"Wrote {args.output}")
    else:
        print(rendered)


if __name__ == "__main__":
    main()
