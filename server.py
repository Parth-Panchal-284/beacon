"""Small local server for the Beacon hackathon prototype.

Run:
    pip install -r requirements.txt
    cp .env.example .env
    # put your real key in .env
    python server.py

Then open http://127.0.0.1:8000
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory

from pipeline.openai_extract import extract_evidence


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

app = Flask(__name__)


@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/styles.css")
def styles():
    return send_from_directory(BASE_DIR, "styles.css")


@app.get("/app.js")
def javascript():
    return send_from_directory(BASE_DIR, "app.js")


@app.get("/data/<path:filename>")
def data_file(filename: str):
    return send_from_directory(BASE_DIR / "data", filename)


@app.get("/api/health")
def health():
    return jsonify(
        {
            "ok": True,
            "openai_key_configured": bool(os.getenv("OPENAI_API_KEY")),
            "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        }
    )


@app.post("/api/extract")
def extract():
    if not os.getenv("OPENAI_API_KEY"):
        return jsonify(
            {
                "error": "OPENAI_API_KEY is not configured on the server.",
                "hint": "Copy .env.example to .env and set OPENAI_API_KEY there.",
            }
        ), 503

    body = request.get_json(silent=True) or {}
    source_id = str(body.get("source_id", "")).strip()
    title = str(body.get("title", "")).strip()
    text = str(body.get("text", "")).strip()

    if not source_id:
        return jsonify({"error": "source_id is required"}), 400
    if len(text) < 40:
        return jsonify({"error": "text must contain at least 40 characters"}), 400
    if len(text) > 30000:
        return jsonify({"error": "text is too long for this prototype; keep it under 30,000 characters"}), 400

    try:
        result = extract_evidence(
            source_id=source_id,
            title=title,
            text=text,
        )
        return jsonify(result)
    except Exception as exc:
        # For a hackathon prototype, return a concise error to make debugging quick.
        # Do not log or return the API key.
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
