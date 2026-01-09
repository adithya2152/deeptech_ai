# parsers.py - Enhanced with industry-standard parsing libraries
from openai import OpenAI
import fitz  # PyMuPDF
import trafilatura
import json
import re
import time
import requests
from collections import Counter
from bs4 import BeautifulSoup
import asyncio
import sys
from typing import Optional, Dict, Any

# Fix Windows async event loop for Playwright
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Advanced parsing imports (with graceful fallbacks)
try:
    from pyresparser import ResumeParser as PyResParser
    PYRESPARSER_AVAILABLE = True
except ImportError:
    PYRESPARSER_AVAILABLE = False
    print("[WARNING] pyresparser not available, using fallback")

try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("[WARNING] playwright not available, using requests fallback")

try:
    from github import Github, GithubException
    PYGITHUB_AVAILABLE = True
except ImportError:
    PYGITHUB_AVAILABLE = False
    print("[WARNING] PyGithub not available, using REST API fallback")

try:
    from magic_pdf.pipe.UNIPipe import UNIPipe
    from magic_pdf.rw.DiskReaderWriter import DiskReaderWriter
    MAGIC_PDF_AVAILABLE = True
except ImportError:
    MAGIC_PDF_AVAILABLE = False
    print("[WARNING] magic-pdf not available, using PyMuPDF fallback")

class BaseParser:
    def __init__(self, api_key):
        if not api_key: raise ValueError("API Key is required.")
        
        # Initialize OpenRouter client
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        self.model = "google/gemini-2.0-flash-exp:free"

    def _clean_json_response(self, text):
        text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'```$', '', text, flags=re.MULTILINE)
        try: return json.loads(text.strip())
        except: 
            # Try to extract JSON from the text
            match = re.search(r'\{[\s\S]*\}', text)
            if match:
                try: return json.loads(match.group())
                except: pass
            return {}

    def _generate_with_retry(self, prompt, retries=3):
        for attempt in range(retries):
            try:
                completion = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3,
                    max_tokens=1500
                )
                response_text = completion.choices[0].message.content
                return self._clean_json_response(response_text)
            except Exception as e:
                print(f"OpenRouter API error (attempt {attempt+1}): {e}")
                if "429" in str(e) or "quota" in str(e).lower():
                    time.sleep(10)
                    continue
                time.sleep(2)
        return None

# 1. PDF Resume Parser (ENHANCED with pyresparser + Gemini)
class ResumeParser(BaseParser):
    def extract_text(self, file_stream):
        doc = fitz.open(stream=file_stream, filetype="pdf")
        return "".join([page.get_text() for page in doc])

    def parse_with_pyresparser(self, file_path):
        """Use pyresparser NER model for initial extraction"""
        try:
            if PYRESPARSER_AVAILABLE:
                data = PyResParser(file_path).get_extracted_data()
                print(f"[ResumeParser] pyresparser extracted: {len(data.get('skills', []))} skills")
                return {
                    'name': data.get('name', ''),
                    'email': data.get('email', ''),
                    'mobile_number': data.get('mobile_number', ''),
                    'skills': data.get('skills', []),
                    'education': data.get('degree', []),
                    'experience': data.get('experience', []),
                    'total_experience': data.get('total_experience', 0),
                    'college_name': data.get('college_name', []),
                    'company_names': data.get('company_names', []),
                    'designation': data.get('designation', [])
                }
        except Exception as e:
            print(f"[ResumeParser] pyresparser error: {e}")
        return None

    def parse(self, text, file_path=None):
        prompt = f"""
        You are an expert resume parser. Extract ALL information from this resume.
        
        IMPORTANT INSTRUCTIONS:
        1. For years_experience: Calculate PRECISELY by analyzing dates in PROFESSIONAL EXPERIENCE section
           - Example: "June 2023 - Aug 2023" = ~0.25 years (3 months)
           - Example: "June 2021 - Aug 2021" = ~0.25 years (3 months)
           - Add up ALL work experiences including internships
        
        2. For skills: Extract EVERY technical skill mentioned anywhere:
           - From SKILLS section
           - From job descriptions (e.g., "ReactJS", "Node", "PostgreSQL")
           - From projects
           - Include: languages, frameworks, databases, tools, platforms
        
        3. For work_history: Extract EACH job with exact dates
        
        Return ONLY valid JSON:
        {{
            "name": "Full Name",
            "years_experience": float (CALCULATED total from work history, e.g., 0.5 for 6 months),
            "skills": ["Python", "JavaScript", "React", "Node.js", "PostgreSQL", "MongoDB", "etc"],
            "skill_count": int,
            "certifications": ["list"],
            "certification_count": int,
            "projects": ["project names"],
            "work_history": [
                {{"company": "Company Name", "role": "Job Title", "start": "Month Year", "end": "Month Year", "duration_months": int}}
            ],
            "education": ["degree info"]
        }}
        
        Resume Text:
        {text[:15000]}
        """
        data = self._generate_with_retry(prompt)
        if data:
            # Ensure skills is a list
            if not isinstance(data.get("skills"), list):
                data["skills"] = []
            data["skill_count"] = len(data.get("skills", []))
        return data if data else {"name": "Unknown", "years_experience": 0, "skill_count": 0, "skills": []}

# 2. Web Resume Parser (ENHANCED with Playwright for JS-heavy sites)
class WebResumeParser(BaseParser):
    async def _fetch_with_playwright(self, url):
        """Use Playwright for JavaScript-rendered content"""
        try:
            print("[WebResumeParser] Using Playwright (JS rendering)...")
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.goto(url, wait_until='networkidle', timeout=30000)
                await page.wait_for_timeout(2000)  # Let JS finish
                content = await page.content()
                await browser.close()
                
                soup = BeautifulSoup(content, 'html.parser')
                for tag in soup(['script', 'style', 'noscript', 'iframe', 'svg']):
                    tag.decompose()
                
                text = soup.get_text(separator=' ', strip=True)
                print(f"[WebResumeParser] Playwright extracted {len(text)} characters")
                return text
        except Exception as e:
            print(f"[WebResumeParser] Playwright error: {e}")
            return None

    def parse(self, url):
        print(f"[WebResumeParser] Fetching: {url}")
        
        # Method 1: Playwright for JS-heavy sites (if available)
        text = None
        if PLAYWRIGHT_AVAILABLE:
            try:
                text = asyncio.run(self._fetch_with_playwright(url))
            except Exception as e:
                print(f"[WebResumeParser] Playwright failed: {e}")
        
        # Method 2: requests + BeautifulSoup (FALLBACK 1)
        if not text or len(text) < 50:
            text = self._fetch_with_requests(url)
        
        # Method 3: trafilatura (FALLBACK 2)
        if not text or len(text) < 50:
            print("[WebResumeParser] Trying trafilatura fallback...")
            text = self._fetch_with_trafilatura(url)
        
        if not text or len(text) < 50:
            print(f"[WebResumeParser] Failed to extract content from {url}")
            return {"error": "Could not extract content", "skills": [], "full_text": ""}
        
        print(f"[WebResumeParser] Extracted {len(text)} characters")
        
        prompt = f"""
        You are analyzing a PORTFOLIO WEBSITE. Extract ALL professional information.
        
        CRITICAL: This is a developer/professional portfolio. Look for:
        1. Name of the person
        2. ALL technical skills - programming languages, frameworks, tools, platforms
        3. Projects with their technologies
        4. Work experience
        5. Education
        
        Even if the content seems sparse, extract what you can find. Look for:
        - Navigation menu items (often list skills/projects)
        - Footer information
        - Any technology names mentioned
        - GitHub/LinkedIn references
        
        Return ONLY valid JSON:
        {{
            "name": "Person's Name",
            "years_experience": float (estimate from timeline or 0 if unknown),
            "skills": ["JavaScript", "React", "Python", "etc - list ALL found"],
            "skill_count": int,
            "certifications": [],
            "certification_count": 0,
            "projects": [
                {{"name": "Project Name", "description": "brief", "technologies": ["tech1", "tech2"]}}
            ],
            "summary": "Professional summary if found",
            "job_titles": ["roles if mentioned"],
            "links": {{"github": "url", "linkedin": "url"}}
        }}
        
        Website Content:
        {text[:12000]}
        """
        
        data = self._generate_with_retry(prompt)
        
        if data:
            data["full_text"] = text[:5000]
            # Extract skills from projects too
            all_skills = list(data.get("skills", []))
            projects = data.get("projects", [])
            if isinstance(projects, list):
                for proj in projects:
                    if isinstance(proj, dict):
                        techs = proj.get("technologies", [])
                        if isinstance(techs, list):
                            all_skills.extend(techs)
            # Deduplicate (case-insensitive)
            seen = set()
            unique_skills = []
            for s in all_skills:
                if s and s.lower() not in seen:
                    seen.add(s.lower())
                    unique_skills.append(s)
            data["skills"] = unique_skills
            data["skill_count"] = len(unique_skills)
            print(f"[WebResumeParser] Found {len(unique_skills)} skills")
        
        return data if data else {"name": "Unknown", "years_experience": 0, "skill_count": 0, "skills": [], "full_text": text}
    
    def _fetch_with_requests(self, url):
        """Primary method - requests + BeautifulSoup"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
            response = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove unwanted elements
            for tag in soup(['script', 'style', 'noscript', 'iframe', 'svg', 'path']):
                tag.decompose()
            
            # Get text with better formatting
            text_parts = []
            
            # Get title
            if soup.title:
                text_parts.append(f"Page Title: {soup.title.string}")
            
            # Get meta description
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc and meta_desc.get('content'):
                text_parts.append(f"Description: {meta_desc['content']}")
            
            # Get main content areas
            main_content = soup.find(['main', 'article']) or soup.find('body')
            if main_content:
                text = main_content.get_text(separator='\n', strip=True)
                text_parts.append(text)
            
            return '\n'.join(text_parts)
            
        except Exception as e:
            print(f"[WebResumeParser] requests error: {e}")
            return None
    
    def _fetch_with_trafilatura(self, url):
        """Fallback method"""
        try:
            downloaded = trafilatura.fetch_url(url)
            if downloaded:
                return trafilatura.extract(downloaded, include_comments=False, include_tables=True, include_links=True)
        except Exception as e:
            print(f"[WebResumeParser] trafilatura error: {e}")
        return None

# 3. Research Parser (ENHANCED with MinerU for superior PDF extraction)
class ResearchParser(BaseParser):
    def _extract_with_magic_pdf(self, pdf_path_or_bytes):
        """Use MinerU's magic-pdf for superior PDF extraction"""
        try:
            if not MAGIC_PDF_AVAILABLE:
                return None
            
            print("[ResearchParser] Using MinerU magic-pdf...")
            import tempfile
            import os
            
            # Create temp directory for output
            temp_dir = tempfile.mkdtemp()
            
            # If bytes, save to temp file
            if isinstance(pdf_path_or_bytes, bytes):
                temp_pdf = os.path.join(temp_dir, "temp.pdf")
                with open(temp_pdf, 'wb') as f:
                    f.write(pdf_path_or_bytes)
                pdf_path = temp_pdf
            else:
                pdf_path = pdf_path_or_bytes
            
            # Initialize MinerU pipe
            reader = DiskReaderWriter(temp_dir)
            pipe = UNIPipe(pdf_path, reader)
            
            # Extract to markdown
            pipe.pipe_classify()
            pipe.pipe_parse()
            md_content = pipe.pipe_mk_markdown(temp_dir, drop_mode="none")
            
            print(f"[ResearchParser] MinerU extracted {len(md_content)} characters")
            
            # Cleanup
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
            
            return md_content
        except Exception as e:
            print(f"[ResearchParser] MinerU error: {e}")
            return None
    
    def _extract_with_pymupdf(self, pdf_bytes):
        """Fallback PyMuPDF extraction"""
        try:
            print("[ResearchParser] Using PyMuPDF fallback...")
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            text_parts = []
            for page_num in range(len(doc)):
                page = doc[page_num]
                page_text = page.get_text()
                if page_text.strip():
                    text_parts.append(page_text)
                    print(f"[ResearchParser] Page {page_num+1}: {len(page_text)} chars")
            return "\n\n".join(text_parts)
        except Exception as e:
            print(f"[ResearchParser] PyMuPDF error: {e}")
            return None
    
    def parse(self, text):
        original_input = text.strip()
        extracted_content = ""
        
        print(f"[ResearchParser] Input: {original_input[:100]}...")
        
        # Handle URL input
        if original_input.startswith('http'):
            url = original_input
            
            # For PDF URLs - download and try advanced extraction
            if '.pdf' in url.lower():
                print("[ResearchParser] Detected PDF URL, downloading...")
                
                # Download PDF
                try:
                    response = requests.get(url, timeout=30, headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    })
                    response.raise_for_status()
                    pdf_bytes = response.content
                    
                    print(f"[ResearchParser] Downloaded {len(pdf_bytes)} bytes")
                    
                    # Try MinerU first (best quality)
                    extracted_content = self._extract_with_magic_pdf(pdf_bytes)
                    
                    # Fallback to PyMuPDF
                    if not extracted_content:
                        extracted_content = self._extract_with_pymupdf(pdf_bytes)
                    
                except Exception as e:
                    print(f"[ResearchParser] Download error: {e}")
            else:
                # HTML page (like Google Scholar, ResearchGate)
                print("[ResearchParser] Detected HTML URL, fetching...")
                extracted_content = self._fetch_html_content(url)
            
            if extracted_content:
                text = extracted_content
                print(f"[ResearchParser] Extracted {len(text)} characters")
            else:
                print("[ResearchParser] Failed to extract content, using URL as-is")
        
        prompt = f"""
        You are a research paper analyzer. Analyze this content THOROUGHLY.
        
        This could be:
        1. Full text of a research paper
        2. Abstract or summary
        3. List of publications
        
        Extract ALL information:
        1. Paper title(s) - EXACT titles
        2. Author names
        3. Abstract/Summary
        4. Technical methods and technologies used
        5. Programming languages, frameworks, tools mentioned
        6. Research domain/field
        7. Key findings
        
        Return ONLY valid JSON:
        {{
            "paper_count": int (1 if single paper, or count if multiple),
            "patent_count": 0,
            "titles": ["Exact Paper Title"],
            "authors": ["Author 1", "Author 2"],
            "abstract": "Full abstract text",
            "summary": "2-3 sentence summary of the research",
            "research_domains": ["Machine Learning", "Computer Vision", "etc"],
            "technologies": ["Python", "TensorFlow", "OpenCV", "etc"],
            "skills": ["all", "technical", "skills", "and", "technologies"],
            "keywords": ["key", "research", "terms"],
            "methodology": "Brief description of methods used"
        }}
        
        Content to analyze:
        {text[:15000]}
        """
        
        data = self._generate_with_retry(prompt)
        
        if data:
            data["full_text"] = text[:5000]
            data["source_url"] = original_input if original_input.startswith('http') else ""
            # Combine skills and technologies
            all_skills = list(data.get("skills", [])) + list(data.get("technologies", []))
            data["skills"] = list(set([s for s in all_skills if s]))
            print(f"[ResearchParser] Found paper_count={data.get('paper_count')}, skills={len(data.get('skills', []))}")
        
        return data if data else {"paper_count": 0, "patent_count": 0, "titles": [], "summary": "", "skills": []}
    
    def _download_and_extract_pdf(self, url):
        """Download PDF and extract text using PyMuPDF."""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/pdf,*/*',
            }
            
            print(f"[ResearchParser] Downloading PDF from {url}")
            response = requests.get(url, headers=headers, timeout=30, allow_redirects=True)
            
            if response.status_code != 200:
                print(f"[ResearchParser] HTTP {response.status_code}")
                return None
            
            content_type = response.headers.get('content-type', '')
            print(f"[ResearchParser] Content-Type: {content_type}, Size: {len(response.content)} bytes")
            
            # Open PDF with PyMuPDF
            doc = fitz.open(stream=response.content, filetype="pdf")
            text_parts = []
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                page_text = page.get_text()
                text_parts.append(page_text)
                print(f"[ResearchParser] Page {page_num+1}: {len(page_text)} chars")
            
            doc.close()
            
            full_text = '\n'.join(text_parts)
            print(f"[ResearchParser] Total extracted: {len(full_text)} characters")
            return full_text
            
        except Exception as e:
            print(f"[ResearchParser] PDF extraction error: {e}")
            return None
    
    def _fetch_html_content(self, url):
        """Fetch HTML page content."""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
            response = requests.get(url, headers=headers, timeout=15)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            for tag in soup(['script', 'style', 'nav', 'footer']):
                tag.decompose()
            
            return soup.get_text(separator='\n', strip=True)
        except Exception as e:
            print(f"[ResearchParser] HTML fetch error: {e}")
            return None

# 4. GitHub Parser (ENHANCED with PyGithub for robust API access)
class GitHubParser(BaseParser):
    def __init__(self, api_key, github_token=None):
        super().__init__(api_key)
        self.github_token = github_token
        self.github_client = None
        
        if PYGITHUB_AVAILABLE and github_token:
            try:
                self.github_client = Github(github_token)
                print("[GitHubParser] Using PyGithub with authentication")
            except Exception as e:
                print(f"[GitHubParser] PyGithub init error: {e}")
        
        # Fallback REST API headers
        self.headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'DeepTech-Expert-Scorer'
        }
        if github_token:
            self.headers["Authorization"] = f"token {github_token}"
    
    def parse(self, username):
        """Parse GitHub username or URL with PyGithub or REST API fallback."""
        # Clean username
        original_input = username
        if 'github.com/' in username:
            username = username.split('github.com/')[-1].strip('/').split('/')[0]
        username = username.strip()
        
        print(f"[GitHubParser] Parsing user: {username}")
        
        # Try PyGithub first (more robust)
        if self.github_client:
            data = self._fetch_with_pygithub(username)
            if data:
                data["input"] = original_input
                return data
        
        # Fallback to REST API
        data = self._fetch_github_api(username)
        
        # Last resort: web scraping
        if not data:
            print("[GitHubParser] API failed, trying web scrape...")
            data = self._fetch_github_web(username)
        
        if data:
            data["input"] = original_input
        
        return data if data else {"error": "Could not fetch GitHub data", "skills": [], "github_repos": 0}
    
    def _fetch_with_pygithub(self, username):
        """Use PyGithub for robust API access with better rate limiting."""
        try:
            user = self.github_client.get_user(username)
            
            # Get user basic info
            print(f"[GitHubParser] Found user via PyGithub: {user.login}, repos: {user.public_repos}")
            
            # Aggregate languages across all repos
            languages = Counter()
            topics_list = []
            stars_total = 0
            forks_total = 0
            repo_data = []
            
            repos = list(user.get_repos(type='all', sort='updated', direction='desc'))[:100]
            
            for repo in repos:
                # Get languages
                try:
                    repo_langs = repo.get_languages()
                    for lang, bytes_count in repo_langs.items():
                        languages[lang] += bytes_count
                except:
                    pass
                
                # Get topics
                try:
                    topics_list.extend(repo.get_topics())
                except:
                    pass
                
                stars_total += repo.stargazers_count
                forks_total += repo.forks_count
                
                repo_data.append({
                    'name': repo.name,
                    'description': repo.description or '',
                    'stars': repo.stargazers_count,
                    'forks': repo.forks_count,
                    'language': repo.language or 'Unknown',
                    'updated': repo.updated_at.isoformat() if repo.updated_at else ''
                })
            
            # Top languages
            top_languages = [lang for lang, _ in languages.most_common(10)]
            
            # Top topics (deduplicated)
            topic_counts = Counter(topics_list)
            top_topics = [topic for topic, _ in topic_counts.most_common(10)]
            
            # Account age
            account_age_years = 0
            if user.created_at:
                from datetime import datetime
                age_days = (datetime.now() - user.created_at.replace(tzinfo=None)).days
                account_age_years = round(age_days / 365.0, 1)
            
            print(f"[GitHubParser] Languages: {top_languages[:5]}, Repos analyzed: {len(repos)}")
            
            return {
                "github_username": user.login,
                "github_name": user.name or user.login,
                "github_bio": user.bio or "",
                "github_repos": user.public_repos,
                "github_followers": user.followers,
                "github_following": user.following,
                "github_gists": user.public_gists,
                "github_stars": stars_total,
                "github_forks": forks_total,
                "github_languages": top_languages,
                "top_topics": top_topics,
                "top_repos": sorted(repo_data, key=lambda x: x['stars'], reverse=True)[:10],
                "account_age_years": account_age_years,
                "skills": top_languages + top_topics,  # Combined for scoring
                "profile_url": user.html_url
            }
            
        except GithubException as e:
            print(f"[GitHubParser] PyGithub API error: {e.status} - {e.data}")
            return None
        except Exception as e:
            print(f"[GitHubParser] PyGithub error: {e}")
            return None
    
    def _fetch_github_api(self, username):
        """Fallback REST API method."""
        try:
            # Get user info
            user_url = f"https://api.github.com/users/{username}"
            print(f"[GitHubParser] Fetching {user_url}")
            user_response = requests.get(user_url, headers=self.headers, timeout=10)
            
            if user_response.status_code == 404:
                print(f"[GitHubParser] User not found: {username}")
                return None
            elif user_response.status_code != 200:
                print(f"[GitHubParser] API error: {user_response.status_code} - {user_response.text[:200]}")
                return None
            
            user_data = user_response.json()
            print(f"[GitHubParser] Found user: {user_data.get('login')}, repos: {user_data.get('public_repos')}")
            
            # Get repos (up to 100)
            repos_url = f"https://api.github.com/users/{username}/repos?per_page=100&sort=updated"
            repos_response = requests.get(repos_url, headers=self.headers, timeout=10)
            repos = repos_response.json() if repos_response.status_code == 200 else []
            
            if isinstance(repos, dict) and 'message' in repos:
                print(f"[GitHubParser] Repos error: {repos.get('message')}")
                repos = []
            
            print(f"[GitHubParser] Fetched {len(repos)} repos")
            
            # Calculate metrics
            total_stars = sum(repo.get('stargazers_count', 0) for repo in repos if isinstance(repo, dict))
            total_forks = sum(repo.get('forks_count', 0) for repo in repos if isinstance(repo, dict))
            
            # Aggregate languages with counts
            languages = [repo.get('language') for repo in repos if isinstance(repo, dict) and repo.get('language')]
            language_counts = Counter(languages)
            top_languages = [lang for lang, _ in language_counts.most_common(10)]
            
            # Get top repos by stars
            sorted_repos = sorted([r for r in repos if isinstance(r, dict)], 
                                  key=lambda x: x.get('stargazers_count', 0), reverse=True)[:10]
            top_repo_info = [{
                "name": repo.get('name', ''),
                "stars": repo.get('stargazers_count', 0),
                "language": repo.get('language', ''),
                "description": (repo.get('description') or '')[:100]
            } for repo in sorted_repos]
            
            # Collect all topics from repos
            all_topics = []
            for repo in repos:
                if isinstance(repo, dict):
                    topics = repo.get('topics', [])
                    if isinstance(topics, list):
                        all_topics.extend(topics)
            top_topics = [t for t, _ in Counter(all_topics).most_common(10)]
            
            # Estimate commits
            estimated_commits = sum(1 for repo in repos if isinstance(repo, dict) and repo.get('size', 0) > 0) * 15
            
            # Build summary
            summary = f"{username} has {len(repos)} public repos with {total_stars} stars. "
            summary += f"Languages: {', '.join(top_languages[:5])}. "
            if user_data.get('bio'):
                summary += f"Bio: {user_data.get('bio')}"
            
            result = {
                "github_repos": user_data.get('public_repos', len(repos)),
                "github_stars": total_stars,
                "github_forks": total_forks,
                "github_followers": user_data.get('followers', 0),
                "github_following": user_data.get('following', 0),
                "github_languages": top_languages,
                "skills": top_languages,
                "top_projects": top_repo_info,
                "top_topics": top_topics,
                "github_bio": user_data.get('bio') or '',
                "github_location": user_data.get('location') or '',
                "github_company": user_data.get('company') or '',
                "github_commits": estimated_commits,
                "github_summary": summary,
                "full_text": summary,
                "profile_url": f"https://github.com/{username}",
                "account_age_years": self._calculate_account_age(user_data.get('created_at', ''))
            }
            
            print(f"[GitHubParser] Success: {len(top_languages)} languages, {total_stars} stars")
            return result
            
        except Exception as e:
            print(f"[GitHubParser] API exception: {e}")
            return None
    
    def _calculate_account_age(self, created_at):
        if not created_at:
            return 0
        try:
            from datetime import datetime
            created = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            now = datetime.now(created.tzinfo)
            return round((now - created).days / 365, 1)
        except:
            return 0
    
    def _fetch_github_web(self, username):
        """Fallback to web scraping if API fails."""
        try:
            url = f"https://github.com/{username}"
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code != 200:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            text = soup.get_text(separator='\n', strip=True)
            
            prompt = f"""
            Extract GitHub profile metrics from this scraped page.
            Return ONLY valid JSON:
            {{
                "github_repos": int,
                "github_stars": int,
                "github_followers": int,
                "github_languages": ["list", "of", "languages"],
                "skills": ["programming", "languages", "found"],
                "top_projects": ["repo1", "repo2"],
                "github_summary": "summary"
            }}
            Text: {text[:5000]}
            """
            data = self._generate_with_retry(prompt)
            if data:
                data["full_text"] = text[:1000]
            return data
            
        except Exception as e:
            print(f"[GitHubParser] Web scrape error: {e}")
            return None

# 5. Engagement Crawler
class EngagementCrawler(BaseParser):
    def parse(self, urls):
        combined_text = ""
        for url in urls:
            try:
                headers = {'User-Agent': 'Mozilla/5.0'}
                response = requests.get(url, headers=headers, timeout=10)
                soup = BeautifulSoup(response.content, 'html.parser')
                text = soup.get_text(separator='\n', strip=True)
                combined_text += f"\n---URL: {url}---\n{text[:3000]}\n"
            except:
                continue
        
        if not combined_text:
            return {"blog_post_count": 0, "community_answers": 0, "upvotes": 0}
        
        prompt = f"""
        Extract Community Engagement Metrics from these URLs.
        Return ONLY valid JSON:
        {{
            "blog_post_count": int,
            "community_answers": int,
            "upvotes": int,
            "engagement_summary": "string"
        }}
        Text: {combined_text[:10000]}
        """
        data = self._generate_with_retry(prompt)
        return data if data else {"blog_post_count": 0, "community_answers": 0, "upvotes": 0}
