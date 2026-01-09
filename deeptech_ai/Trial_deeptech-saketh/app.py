import streamlit as st
import json
import re
import asyncio
import pandas as pd
from typing import Dict, Any
from dataclasses import dataclass, asdict
from pathlib import Path
import time

# =========================
# CONFIG
# =========================
st.set_page_config(page_title="DeepTech Resume Scorer", page_icon="🚀", layout="wide")

MODEL_NAME = "gemini-2.5-flash"
MAX_CHARS = 12000          # HARD safety limit
REQUEST_DELAY = 3          # seconds
MAX_RETRIES = 2

# =========================
# OPTIONAL DEPENDENCIES
# =========================
try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

try:
    from sentence_transformers import SentenceTransformer, util
    HAS_ST = True
except ImportError:
    HAS_ST = False

try:
    import fitz
    HAS_PDF = True
except ImportError:
    HAS_PDF = False

try:
    from docx import Document
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

# =========================
# DATA MODELS
# =========================
@dataclass
class ScoreComponents:
    expertise_score: float = 0
    performance_score: float = 0
    reliability_score: float = 0
    quality_score: float = 0
    engagement_score: float = 0
    resume_score: float = 0
    overall_score: float = 0

# =========================
# DOCUMENT EXTRACTION
# =========================
class DocumentProcessor:
    @staticmethod
    def extract_text(file_obj, ext: str) -> str:
        try:
            if ext == "pdf" and HAS_PDF:
                text = ""
                with fitz.open(stream=file_obj.read(), filetype="pdf") as doc:
                    for page in doc:
                        text += page.get_text()
                return text

            if ext == "docx" and HAS_DOCX:
                doc = Document(file_obj)
                return "\n".join(p.text for p in doc.paragraphs)

            if ext == "txt":
                return file_obj.read().decode("utf-8", errors="ignore")

            return ""
        except Exception as e:
            return f"ERROR: {e}"

# =========================
# GEMINI CHUNKER (CLEAN)
# =========================
class GeminiResumeChunker:
    def __init__(self, api_key: str):
        if not HAS_GEMINI:
            raise RuntimeError("Gemini SDK not installed")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(MODEL_NAME)

    async def chunk_resume_async(self, text: str) -> Dict[str, Any]:
        resume_text = text[:MAX_CHARS]

        prompt = f"""
You are an expert resume parser.

TASK:
Extract structured information from the resume.

RULES:
- Extract facts only.
- Do NOT calculate experience years.
- Keep summaries max 3 sentences.
- Return valid JSON only.

OUTPUT FORMAT:
{{
  "NAME": "",
  "EMAIL": "",
  "PHONE": "",
  "LOCATION": "",
  "LINKEDIN": "",
  "GITHUB": "",
  "SUMMARY": "",
  "SKILLS": [],
  "WORK_EXPERIENCE": [],
  "EDUCATION": [],
  "PROJECTS": [],
  "CERTIFICATIONS": [],
  "PUBLICATIONS": []
}}

RESUME TEXT:
{resume_text}
"""

        response = None

        for attempt in range(MAX_RETRIES):
            try:
                response = await self.model.generate_content_async(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.1,
                        response_mime_type="application/json"
                    )
                )
                break
            except Exception:
                await asyncio.sleep(REQUEST_DELAY * (attempt + 1))

        if not response:
            return self._fallback(text)

        raw = response.text.strip()
        raw = re.sub(r"^```json|```$", "", raw, flags=re.I).strip()

        try:
            parsed = json.loads(raw)
            return parsed
        except Exception:
            return self._fallback(text)

    def _fallback(self, text: str) -> Dict[str, Any]:
        name = text.strip().split("\n")[0][:40]
        return {
            "NAME": name,
            "SUMMARY": "Resume parsed with limited structure.",
            "SKILLS": [],
            "WORK_EXPERIENCE": [],
            "EDUCATION": [],
            "PROJECTS": [],
            "CERTIFICATIONS": [],
            "PUBLICATIONS": []
        }

# =========================
# SEMANTIC SKILL MATCHER
# =========================
class SemanticSkillMatcher:
    SKILLS = [
        "Python","Java","C++","JavaScript","SQL","PyTorch","TensorFlow",
        "FastAPI","Django","AWS","Docker","Kubernetes","React","MongoDB",
        "PostgreSQL","Git","Linux","Kafka","Spark"
    ]

    def __init__(self):
        self.model = None
        self.emb = None
        if HAS_ST:
            self.model = SentenceTransformer("all-MiniLM-L6-v2")
            self.emb = self.model.encode(self.SKILLS, convert_to_tensor=True)

    def extract(self, text: str):
        if not self.model:
            return []
        words = list(set(re.findall(r"[A-Za-z\+\#\.]{2,}", text)))
        vecs = self.model.encode(words, convert_to_tensor=True)
        sims = util.cos_sim(vecs, self.emb)
        found = set()
        for i in range(len(words)):
            for j in range(len(self.SKILLS)):
                if sims[i][j] > 0.5:
                    found.add(self.SKILLS[j])
        return list(found)

# =========================
# SCORING SYSTEM
# =========================
class ExpertScoringSystem:
    def __init__(self, api_key: str):
        self.chunker = GeminiResumeChunker(api_key)
        self.matcher = SemanticSkillMatcher()

    async def process(self, name: str, text: str):
        chunks = await self.chunker.chunk_resume_async(text)

        skills = chunks.get("SKILLS", [])
        semantic = self.matcher.extract(text)
        skills = list(set(skills + semantic))

        years = 0
        m = re.search(r"(\d+)\+?\s*years", text.lower())
        if m:
            years = int(m.group(1))

        scores = ScoreComponents()
        scores.quality_score = min(100, len(skills) * 4 + years * 2)
        scores.reliability_score = 25 * sum([
            bool(chunks.get("WORK_EXPERIENCE")),
            bool(chunks.get("EDUCATION")),
            bool(skills),
            bool(chunks.get("PROJECTS"))
        ])
        scores.performance_score = min(100, 50 + years * 5)
        scores.expertise_score = min(100, years * 4 + len(skills) * 2)
        scores.engagement_score = min(100, len(text) / 30)
        scores.resume_score = (scores.quality_score + scores.reliability_score) / 2
        scores.overall_score = (
            scores.expertise_score * 0.25 +
            scores.performance_score * 0.30 +
            scores.reliability_score * 0.25 +
            scores.quality_score * 0.15 +
            scores.engagement_score * 0.05
        )

        chunks["SKILLS"] = skills

        return {
            "name": chunks.get("NAME", name),
            "scores": asdict(scores),
            "chunks": chunks,
            "years": years
        }

# =========================
# STREAMLIT APP
# =========================
async def run(api_key, data):
    system = ExpertScoringSystem(api_key)
    results = []
    for name, text in data:
        results.append(await system.process(name, text))
        await asyncio.sleep(REQUEST_DELAY)
    return results

def main():
    st.sidebar.title("⚙️ Settings")
    api_key = st.sidebar.text_input("Gemini API Key", type="password")

    st.title("🚀 DeepTech Resume Scorer")

    uploaded = st.file_uploader(
        "Upload Resumes",
        type=["pdf","docx","txt"],
        accept_multiple_files=True
    )

    data = []
    if uploaded:
        for f in uploaded:
            ext = f.name.split(".")[-1].lower()
            text = DocumentProcessor.extract_text(f, ext)
            data.append((f.name, text))

    if st.button("Analyze"):
        if not api_key or not data:
            st.error("API key & resume required")
            return

        with st.spinner("Processing..."):
            results = asyncio.run(run(api_key, data))

        df = pd.DataFrame([
            {
                "Candidate": r["name"],
                "Overall": r["scores"]["overall_score"],
                "Skills": ", ".join(r["chunks"]["SKILLS"]),
                "Experience (yrs)": r["years"]
            }
            for r in results
        ]).sort_values("Overall", ascending=False)

        st.dataframe(df, use_container_width=True)

        for r in results:
            with st.expander(r["name"]):
                st.write("### Summary")
                st.write(r["chunks"].get("SUMMARY",""))
                st.write("### Skills")
                st.write(", ".join(r["chunks"]["SKILLS"]))

if __name__ == "__main__":
    main()
