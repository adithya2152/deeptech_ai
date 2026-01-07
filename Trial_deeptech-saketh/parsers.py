# parsers.py
import google.generativeai as genai
import fitz  # PyMuPDF
import trafilatura
import json
import re
import time

class BaseParser:
    def __init__(self, api_key):
        if not api_key: raise ValueError("API Key is required.")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    def _clean_json_response(self, text):
        text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
        try: return json.loads(text.strip())
        except: return {}

    def _generate_with_retry(self, prompt, retries=3):
        for attempt in range(retries):
            try:
                response = self.model.generate_content(prompt)
                return self._clean_json_response(response.text)
            except Exception as e:
                if "429" in str(e) or "quota" in str(e).lower():
                    time.sleep(10)
                    continue
                return None
        return None

# 1. PDF Resume Parser
class ResumeParser(BaseParser):
    def extract_text(self, file_stream):
        doc = fitz.open(stream=file_stream, filetype="pdf")
        return "".join([page.get_text() for page in doc])

    def parse(self, text):
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
        Resume Text: {text[:15000]}
        """
        data = self._generate_with_retry(prompt)
        return data if data else {"name": "Unknown", "years_experience": 0, "skill_count": 0}

# 2. Web Resume Parser
class WebResumeParser(BaseParser):
    def parse(self, url):
        try:
            downloaded = trafilatura.fetch_url(url)
            if not downloaded: return {"error": "Fetch failed"}
            text = trafilatura.extract(downloaded)
            
            prompt = f"""
            Treat this website content as a Professional Resume.
            Return ONLY valid JSON:
            {{
                "name": "string",
                "years_experience": float,
                "skills": ["list", "of", "skills"],
                "skill_count": int,
                "certifications": ["list", "of", "strings"],
                "certification_count": int
            }}
            Website Text: {text[:15000]}
            """
            data = self._generate_with_retry(prompt)
            return data if data else {"name": "Unknown", "years_experience": 0, "skill_count": 0}
        except Exception as e:
            return {"error": str(e)}

# 3. Research Parser (UPDATED FOR TITLES)
class ResearchParser(BaseParser):
    def parse(self, text):
        prompt = f"""
        Analyze this text for Research Output.
        
        CRITICAL: Extract the actual Titles of the papers/patents found.
        
        Return ONLY valid JSON:
        {{
            "paper_count": int,
            "patent_count": int,
            "titles": ["List of paper titles found", "Title 2", "Title 3"],
            "summary": "1 sentence summary of research focus"
        }}
        Text: {text[:10000]}
        """
        data = self._generate_with_retry(prompt)
        return data if data else {"paper_count": 0, "patent_count": 0, "titles": [], "summary": ""}

# 4. Engagement Crawler (UPDATED FOR TOPICS)
class EngagementCrawler(BaseParser):
    def parse(self, url):
        try:
            downloaded = trafilatura.fetch_url(url)
            text = trafilatura.extract(downloaded) if downloaded else ""
            
            prompt = f"""
            Analyze this website for Community Engagement signals.
            
            CRITICAL: Extract the topics they write about and any specific post titles.
            
            Return ONLY valid JSON:
            {{
                "blog_post_count": int,
                "community_answers": int,
                "upvotes": int,
                "top_topics": ["Topic 1", "Topic 2"],
                "latest_post_title": "string",
                "engagement_summary": "1 sentence description of their activity"
            }}
            Website Text: {text[:15000]}
            """
            data = self._generate_with_retry(prompt)
            return data if data else {"blog_post_count": 0, "community_answers": 0, "upvotes": 0, "top_topics": []}
        except Exception as e:
            return {"error": str(e), "blog_post_count": 0}