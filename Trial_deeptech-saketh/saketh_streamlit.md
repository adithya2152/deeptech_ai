# Comprehensive Summary: Agentic Resume Scorer Project

This document summarizes the development of the Agentic Resume Scorer, a production-grade system designed to intelligently parse, analyze, and score candidate profiles.

## 🎯 Project Objective
To build a system that parses resumes (PDF/DOCX) and portfolios (URLs), intelligently splits them into sections using AI, and scores candidates based on **semantic skill matching** rather than simple keyword counting.

---

## 🛠️ Tech Stack & Architecture

* **Frontend:** `Streamlit` (for the dashboard/UI).
* **Agentic Brain:** `Google Gemini 1.5 Flash` (via `google-generativeai`).
    * *Role:* Intelligently chunks raw text into JSON sections (Experience, Education, Skills) to remove noise.
* **Semantic Brain:** `Sentence Transformers` (`all-MiniLM-L6-v2`).
    * *Role:* Converts text into vector embeddings to calculate **Cosine Similarity**. It understands that "ML" $\approx$ "Machine Learning".
* **Parsers:**
    * `PyMuPDF` (PDFs)
    * `python-docx` (Word Docs)
    * `Trafilatura` (Websites/Blogs)

---

## 📊 The Scoring Logic (Dynamic)

We moved away from hardcoded scores. Every score is now calculated mathematically based on the resume content:

1.  **Expertise Score:** Measures technical depth based on the **quantity of semantically matched skills** (e.g., matching "React" in the resume to "Web Frameworks" in the DB).
2.  **Quality Score:** A weighted sum of **Education Level** (PhD > Masters), **Certifications**, and **Years of Experience**.
3.  **Reliability Score:** Measures **Completeness**. Did Gemini find all standard sections (Summary, Exp, Edu, Skills)? If sections are missing, this score drops.
4.  **Performance Score:** A heuristic based on **Seniority**. Higher points for advanced degrees and >5 years of experience.
5.  **Engagement Score:** Measures effort based on **Resume Detail/Length**.
6.  **Overall Score:** A weighted average of all the above ($35\%$ Expertise, $25\%$ Quality, etc.).

---

## 🚀 Key Features Implemented

* **Multi-Format Support:** Handles PDF, DOCX, TXT, Copy-Paste, and URLs (Portfolios/Blogs).
* **Async Processing:** Uses `asyncio` to process multiple candidates in parallel (fast!).
* **Robust Error Handling:**
    * **Fallback Names:** If AI fails to extract a name, it uses the filename.
    * **Safe Parsing:** Handles cases where Gemini returns Lists instead of Strings, preventing app crashes.
    * **Skill Extraction:** Improved Regex to correctly split skills by semicolons (`;`) and detect short skills like "C" or "R".
* **Leaderboard UI:** Displays a comparison table of all candidates sorted by score.

---

## ❓ Current Blocker / Next Step

Everything is working locally. The final piece is connecting this to your company's database.

* **The Question:** We need to know if your `experts` table stores the **raw resume text** or just a **file path (S3 URL)**.
* **The Action:** You are sending a clarification message to your senior to resolve this.