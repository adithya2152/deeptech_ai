# 🎯 Agentic Resume Scorer

> **A Production-Grade AI System for Intelligent Candidate Profiling & Scoring**

This project is an advanced Resume Parsing and Scoring engine that moves beyond simple keyword matching. It leverages **Generative AI (Gemini 2.5)** for structured data extraction and **Vector Embeddings (Sentence Transformers)** for semantic skill analysis, providing a holistic "DeepTech Score" for candidates.

---

## 🎯 Project Objective

To build a system that parses resumes (PDF) and portfolios (URLs), intelligently splits them into sections using AI, and scores candidates based on **semantic skill matching** rather than simple keyword counting.

**Core Philosophy:**
* **No Hardcoded Rules:** Skills are matched based on meaning (e.g., "Deep Learning" matches "AI").
* **Content-Driven:** Scores are derived 100% from the uploaded documents and links, not simulated database metrics.
* **Transparency:** Every calculation is explainable, and every analysis leaves a JSON audit trail.

---

## 🏗️ System Architecture

The system is modular, consisting of four core components:

1.  **Frontend (`app.py`)**: A Streamlit dashboard for uploading files, visualizing scores, and generating reports.
2.  **Logic (`scoring_engine.py`)**: A mathematical engine that calculates weighted scores based on parsed metrics.
3.  **Extraction (`parsers.py`)**: A set of robust parsers for PDF resumes, Web Portfolios, and Research Papers. It handles OCR, text cleaning, and AI-based JSON extraction.
4.  **Intelligence (`matcher.py`)**: A neural search engine that converts text into vectors to find "hidden" skills and calculate semantic similarity against job descriptions.

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **LLM** | `Google Gemini 1.5 Flash` | Agentic chunking of raw text into structured JSON (Skills, Exp, Edu). |
| **NLP** | `SentenceTransformers` | Semantic search using `all-MiniLM-L6-v2` embeddings. |
| **Parsing** | `PyMuPDF (fitz)` | High-fidelity text extraction from PDFs. |
| **Crawling** | `Trafilatura` | Clean main-text extraction from websites/blogs (removes ads/nav). |
| **UI** | `Streamlit` | Interactive dashboard for the scoring interface. |
| **Viz** | `Plotly` | Radar charts and metric visualization. |

---

## 📊 The Scoring Logic (Dynamic)

We utilize a **Dynamic Weighted Scoring System** (0-100 Scale) derived purely from the candidate's content.

### 1. Expertise Score (35%)
* **Metric:** Technical depth & breadth.
* **Logic:** Rewards candidates who have both explicit skills (keywords) and implicit skills (semantic matches found by the Neural Engine).
* **Formula:** `(Semantic_Skills * 3) + (Raw_Skills * 1)` (Capped at 100).

### 2. Quality Score (25%)
* **Metric:** Professional credibility.
* **Logic:** Weighted sum of **Education Level** (PhD > Masters > Bachelors), **Certifications**, and **Years of Experience**.

### 3. Reliability Score (15%)
* **Metric:** Profile completeness & data integrity.
* **Logic:** Checks if the AI successfully extracted all critical sections (Name, Summary, Work History, Education, Skills). Prevents "empty" or poorly formatted resumes from ranking high.

### 4. Performance Score (15%)
* **Metric:** Seniority & Track Record.
* **Logic:** Heuristic scoring based on years of experience thresholds (>5y, >8y) and advanced degrees.

### 5. Engagement Score (10%)
* **Metric:** Detail & External Activity.
* **Logic:** Awards points for detailed resume descriptions (text length), listed projects, and external blog/community links (if provided).

---

## 📂 Project Structure

```bash
.
├── app.py                 # Main Dashboard (Streamlit)
├── parsers.py             # PDF, Web, & Research Parsers (Gemini + Trafilatura)
├── scoring_engine.py      # Mathematical Scoring Logic
├── matcher.py             # Semantic Vector Engine (SentenceTransformers)
├── requirements.txt       # Project Dependencies
└── output/                # Auto-generated JSON reports & logs
```

---

## 🚀 Setup & Installation

### 1. Prerequisites
* Python 3.9+
* Google Gemini API Key

### 2. Installation

First, clone the repository and navigate to the project directory:

```bash
git clone [https://github.com/your-repo/agentic-resume-scorer.git](https://github.com/your-repo/agentic-resume-scorer.git)
cd agentic-resume-scorer
```

Next, install the required dependencies:

```bash
pip install -r requirements.txt
```

### 3. Running the App

Launch the dashboard using Streamlit:

```bash
streamlit run app.py
```

The application will open in your default browser at `http://localhost:8501`.

---

## 🌟 Key Features

* **Agentic Chunking:** Uses LLMs to intelligently split resumes into `Experience`, `Education`, and `Skills`, handling complex layouts better than Regex.
* **Semantic Search:** Finds "Machine Learning" skills even if the candidate only wrote "Neural Networks" or "Deep Learning" via vector similarity.
* **Job Fit Analysis:** Allows users to paste a Job Description to calculate a specific **Semantic Fit Score** (0-100%) alongside the general rank.
* **Multi-Source Data:** Can merge data from a PDF Resume + a Web Portfolio + a list of Research Papers into a single candidate profile.
* **Auto-Retry Logic:** Parsers include automatic backoff for API rate limits (429 errors).
* **Audit Trail:** Every analysis saves a timestamped JSON file to the `output/` directory for verification.

---

## 🔮 Future Roadmap

* [ ] **Batch Processing:** Enable uploading a ZIP of 50+ resumes at once.
* [ ] **Database Sync:** Connect final scores directly to PostgreSQL.
* [ ] **Bias Check:** Add an AI layer to flag potential bias in resume language.
