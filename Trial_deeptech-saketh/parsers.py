import google.generativeai as genai
import fitz  # PyMuPDF
import trafilatura
import docx2txt
import json
import re
import time
from trafilatura.settings import Extractor

# CONSTANTS
RATE_LIMIT_DELAY = 4.0  

class BaseParser:
    def __init__(self, api_key):
        if not api_key: raise ValueError("API Key is required.")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def _optimize_text(self, text, max_chars=15000):
        if not text: return ""
        text = re.sub(r'\s+', ' ', text).strip()
        return text[:max_chars]

    def _clean_json_response(self, text):
        json_match = re.search(r'```json\s*({.*?})\s*```', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except:
                pass
        try:
            return json.loads(text)
        except:
            return {}

    def _generate_with_retry(self, prompt, retries=3):
        for attempt in range(retries):
            try:
                time.sleep(RATE_LIMIT_DELAY) # Rate Limiter
                response = self.model.generate_content(prompt)
                if response.text:
                    return self._clean_json_response(response.text)
            except Exception as e:
                if "429" in str(e) or "quota" in str(e).lower():
                    time.sleep(10)
                    continue
        return {}

class ResumeParser(BaseParser):
    def extract_text(self, file_stream, file_ext):
        text = ""
        try:
            if file_ext == 'pdf':
                doc = fitz.open(stream=file_stream, filetype="pdf")
                text = "".join([page.get_text() for page in doc])
            elif file_ext == 'docx':
                text = docx2txt.process(file_stream)
            elif file_ext == 'txt':
                text = file_stream.read().decode('utf-8')
        except Exception as e:
            print(f"Error: {e}")
        return text

    def parse(self, text):
        clean_text = self._optimize_text(text, 25000)
        prompt = f"""
        Extract structured data from this Resume.
        Return ONLY valid JSON with these keys:
        {{
            "name": "string",
            "years_experience": float,
            "skills": ["list", "of", "strings"],
            "skill_count": int,
            "certifications": ["list", "of", "strings"],
            "certification_count": int,
            "projects": ["list", "of", "project", "names"]
        }}
        Resume Text: {clean_text}
        """
        return self._generate_with_retry(prompt)

class WebResumeParser(BaseParser):
    def parse(self, url):
        try:
            extract_options = Extractor(output_format="txt", with_metadata=False, comments=False, tables=True, links=False, dedup=True)
            downloaded = trafilatura.fetch_url(url)
            if not downloaded: return {"error": "Fetch failed"}
            text = trafilatura.extract(downloaded, options=extract_options)
            
            clean_text = self._optimize_text(text, 15000)
            prompt = f"""
            Treat this website content as a Professional Resume.
            Return ONLY valid JSON with these keys:
            {{
                "name": "string",
                "years_experience": float,
                "skills": ["list", "of", "skills"],
                "skill_count": int,
                "certifications": ["list", "of", "strings"],
                "certification_count": int,
                "projects": ["list", "of", "project", "names"]
            }}
            Website Text: {clean_text}
            """
            return self._generate_with_retry(prompt)
        except Exception as e:
            return {"error": str(e)}

class ResearchParser(BaseParser):
    def parse(self, file_stream):
        try:
            doc = fitz.open(stream=file_stream, filetype="pdf")
            text = "".join([page.get_text() for page in doc])
        except Exception as e:
            return {"error": str(e)}

        clean_text = self._optimize_text(text, 20000)
        prompt = f"""
        Analyze this Research Paper.
        CRITICAL: Extract actual Titles of papers/patents found.
        Return ONLY valid JSON with these keys:
        {{
            "paper_count": int,
            "patent_count": int,
            "titles": ["List of paper titles found", "Title 2"],
            "summary": "1 sentence summary"
        }}
        Text: {clean_text}
        """
        return self._generate_with_retry(prompt)

class EngagementCrawler(BaseParser):
    def parse(self, url):
        try:
            extract_options = Extractor(output_format="txt", with_metadata=False, comments=False, tables=True, links=False, dedup=True)
            downloaded = trafilatura.fetch_url(url)
            if not downloaded: return {"error": "Fetch failed"}
            text = trafilatura.extract(downloaded, options=extract_options)
            
            clean_text = self._optimize_text(text, 15000)
            prompt = f"""
            Analyze this website for Community Engagement signals.
            Return ONLY valid JSON with these keys:
            {{
                "blog_post_count": int,
                "community_answers": int,
                "upvotes": int,
                "top_topics": ["Topic 1", "Topic 2"],
                "latest_post_title": "string",
                "engagement_summary": "1 sentence description"
            }}
            Website Text: {clean_text}
            """
            return self._generate_with_retry(prompt)
        except Exception as e:
            return {"error": str(e), "blog_post_count": 0}