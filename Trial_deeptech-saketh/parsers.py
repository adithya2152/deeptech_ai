# parsers.py
import google.generativeai as genai
import fitz  # PyMuPDF
import trafilatura
import docx2txt
import json
import re
import time
from trafilatura.settings import Extractor

class BaseParser:
    def __init__(self, api_key):
        if not api_key: raise ValueError("API Key is required.")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def _clean_json_response(self, text):
        """
        Extracts JSON from the response and prints the separate chunked output if present.
        """
        # 1. Regex to find the JSON block enclosed in ```json ... ```
        json_match = re.search(r'```json\s*({.*?})\s*```', text, re.DOTALL)
        
        cleaned_json_data = {}
        
        if json_match:
            json_string = json_match.group(1)
            try:
                cleaned_json_data = json.loads(json_string)
            except json.JSONDecodeError:
                # Fallback: Try cleaning standard markdown if regex fails slightly
                clean_text = re.sub(r'^```json\s*', '', json_string, flags=re.MULTILINE)
                clean_text = re.sub(r'^```\s*', '', clean_text, flags=re.MULTILINE)
                try:
                    cleaned_json_data = json.loads(clean_text.strip())
                except:
                    pass

            # 2. Handle the "Separate Lists" printing (Everything after the JSON block)
            full_match = json_match.group(0)
            post_json_text = text.replace(full_match, "").strip()
            
            if post_json_text:
                print("\n" + "="*40)
                print(" EXTRACTED CHUNKED LISTS (DEBUG OUTPUT) ")
                print("="*40)
                print(post_json_text)
                print("="*40 + "\n")
        else:
            # Fallback if no code blocks found
            try:
                cleaned_json_data = json.loads(text)
            except:
                pass

        return cleaned_json_data

    def _generate_with_retry(self, prompt, retries=3):
        for attempt in range(retries):
            try:
                response = self.model.generate_content(prompt)
                if response.text:
                    return self._clean_json_response(response.text)
            except Exception as e:
                if "429" in str(e) or "quota" in str(e).lower():
                    time.sleep(10)
                    continue
                return None
        return None

# 1. Unified Resume Parser (PDF, DOCX, TXT)
class ResumeParser(BaseParser):
    def extract_text(self, file_stream, file_ext):
        """
        Extracts text based on file extension.
        """
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
            print(f"Error extracting text from {file_ext}: {e}")
        return text

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
        
        Also seperately show chunked output as seperate lists after the JSON block.
        
        Resume Text: {text[:30000]}
        """
        data = self._generate_with_retry(prompt)
        return data if data else {"name": "Unknown", "years_experience": 0, "skill_count": 0}

# 2. Web Resume Parser
class WebResumeParser(BaseParser):
    def parse(self, url):
        try:
            extract_options = Extractor(
                output_format="txt",
                with_metadata=False,
                comments=False,
                tables=True,
                links=False,
                dedup=True
            )
            downloaded = trafilatura.fetch_url(url)
            if not downloaded: return {"error": "Fetch failed"}
            text = trafilatura.extract(downloaded, options=extract_options)
            
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
            
            Also seperately show chunked output as seperate lists after the JSON block.
            
            Website Text: {text[:15000]}
            """
            data = self._generate_with_retry(prompt)
            return data if data else {"name": "Unknown", "years_experience": 0, "skill_count": 0}
        except Exception as e:
            return {"error": str(e)}

# 3. Research Parser (Now accepts PDF)
class ResearchParser(BaseParser):
    def parse(self, file_stream):
        # Extract text from PDF first
        try:
            doc = fitz.open(stream=file_stream, filetype="pdf")
            text = "".join([page.get_text() for page in doc])
        except Exception as e:
            return {"error": f"PDF Read Error: {str(e)}"}

        prompt = f"""
        Analyze this Research Paper / Document.
        
        CRITICAL: Extract the actual Titles of the papers/patents found.
        
        Return ONLY valid JSON with these keys:
        {{
            "paper_count": int,
            "patent_count": int,
            "titles": ["List of paper titles found", "Title 2", "Title 3"],
            "summary": "1 sentence summary of research focus"
        }}
        
        Also seperately show chunked output as seperate lists after the JSON block.
        
        Text: {text[:20000]}
        """
        data = self._generate_with_retry(prompt)
        return data if data else {"paper_count": 0, "patent_count": 0, "titles": [], "summary": ""}

# 4. Engagement Crawler
class EngagementCrawler(BaseParser):
    def parse(self, url):
        try:
            extract_options = Extractor(
                output_format="txt",
                with_metadata=False,
                comments=False,
                tables=True,
                links=False,
                dedup=True
            )
            
            downloaded = trafilatura.fetch_url(url)
            if not downloaded: return {"error": "Fetch failed"}
            
            text = trafilatura.extract(downloaded, options=extract_options)
            
            prompt = f"""
            Analyze this website for Community Engagement signals.
            CRITICAL: Extract the topics they write about and any specific post titles.
            
            Return ONLY valid JSON with these keys:
            {{
                "blog_post_count": int,
                "community_answers": int,
                "upvotes": int,
                "top_topics": ["Topic 1", "Topic 2"],
                "latest_post_title": "string",
                "engagement_summary": "1 sentence description of their activity"
            }}
            
            Also seperately show chunked output as seperate lists after the JSON block.
            
            Website Text: {text[:15000] if text else ""}
            """
            data = self._generate_with_retry(prompt)
            return data if data else {"blog_post_count": 0, "community_answers": 0, "upvotes": 0, "top_topics": []}
        except Exception as e:
            return {"error": str(e), "blog_post_count": 0}