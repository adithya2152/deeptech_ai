# parsers.py - Pure extraction without LLM (optimized for single LLM call)
import fitz  # PyMuPDF
import trafilatura
from trafilatura.settings import Extractor
import docx2txt
import json
import re
import requests

extract_options = Extractor(output_format="txt", with_metadata=False, comments=False, tables=True, links=False, dedup=True)

class ResumeParser:
    """Extract text and basic info from resume PDFs - NO LLM"""
    
    def extract_text(self, file_stream, file_ext="pdf"):
        text = ""
        try:
            if file_ext == 'pdf':
                doc = fitz.open(stream=file_stream, filetype="pdf")
                text = "".join([page.get_text() for page in doc])
            elif file_ext == 'txt':
                text = file_stream.read().decode('utf-8')
        except Exception as e:
            print(f"[ResumeParser] Error: {e}")
        return text

    def parse(self, text):
        """Extract resume text with basic regex patterns - no LLM"""
        
        # Basic extraction using regex patterns
        name = self._extract_name(text)
        email = self._extract_email(text)
        phone = self._extract_phone(text)
        skills = self._extract_skills_keywords(text)
        
        print(f"[ResumeParser] Extracted: name={name}, email={email}, skills={len(skills)}")
        
        return {
            "source_type": "resume",
            "raw_text": text,
            "name": name,
            "email": email,
            "phone": phone,
            "skills_keywords": skills,  # Basic keyword extraction
            "char_count": len(text),
            "extraction_method": "regex"
        }
    
    def _extract_name(self, text):
        """Simple name extraction - first line or pattern"""
        lines = text.strip().split('\n')
        for line in lines[:5]:
            line = line.strip()
            if line and len(line) < 50 and not '@' in line:
                return line
        return "Unknown"
    
    def _extract_email(self, text):
        """Extract email address"""
        match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        return match.group(0) if match else ""
    
    def _extract_phone(self, text):
        """Extract phone number"""
        match = re.search(r'\+?1?\s*\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})', text)
        return match.group(0) if match else ""
    
    def _extract_skills_keywords(self, text):
        """Extract common tech skills using keyword matching"""
        common_skills = [
            'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin',
            'React', 'Angular', 'Vue', 'Node.js', 'Django', 'Flask', 'Spring', 'Express',
            'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 'GitHub',
            'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch',
            'Machine Learning', 'Deep Learning', 'AI', 'TensorFlow', 'PyTorch', 'Scikit-learn',
            'HTML', 'CSS', 'Tailwind', 'Bootstrap', 'REST', 'GraphQL', 'API',
            'Linux', 'Windows', 'MacOS', 'Bash', 'PowerShell', 'Terraform', 'Ansible'
        ]
        
        found_skills = []
        text_lower = text.lower()
        for skill in common_skills:
            if skill.lower() in text_lower:
                found_skills.append(skill)
        
        return found_skills

class WebResumeParser:
    """Extract text from portfolio websites - NO LLM"""
    
    def parse(self, url):
        try:
            print(f"[WebResumeParser] Fetching: {url}")
            
            # Use trafilatura for content extraction
            downloaded = trafilatura.fetch_url(url)
            if not downloaded:
                print("[WebResumeParser] Fetch failed")
                return {"error": "Fetch failed", "raw_text": ""}
            
            # Extract with aggressive settings
            text = trafilatura.extract(
                downloaded,
                options=extract_options,
                favor_recall=True
            )
            
            # Fallback extraction
            if not text or len(text) < 100:
                from trafilatura import bare_extraction
                result = bare_extraction(downloaded, with_metadata=True)
                if result:
                    text = result.get('text', '') or result.get('raw_text', '')
            
            if not text or len(text) < 50:
                print(f"[WebResumeParser] Insufficient content: {len(text) if text else 0} chars")
                return {"error": "Insufficient content", "raw_text": ""}
            
            print(f"[WebResumeParser] Extracted {len(text)} chars")
            
            return {
                "source_type": "portfolio",
                "source_url": url,
                "raw_text": text,
                "char_count": len(text),
                "extraction_method": "trafilatura"
            }
        except Exception as e:
            print(f"[WebResumeParser] Error: {e}")
            return {"error": str(e), "raw_text": ""}

class ResearchParser:
    """Extract text from research papers - NO LLM"""
    
    def parse(self, file_stream):
        try:
            # Handle URL input
            if isinstance(file_stream, str) and file_stream.startswith('http'):
                print(f"[ResearchParser] Fetching URL: {file_stream}")
                response = requests.get(file_stream, timeout=30)
                response.raise_for_status()
                
                if 'application/pdf' in response.headers.get('Content-Type', ''):
                    doc = fitz.open(stream=response.content, filetype="pdf")
                    text = "".join([page.get_text() for page in doc])
                else:
                    # Try trafilatura for HTML
                    text = trafilatura.extract(response.text, favor_recall=True)
            else:
                # Handle file stream
                doc = fitz.open(stream=file_stream, filetype="pdf")
                text = "".join([page.get_text() for page in doc])
                
        except Exception as e:
            print(f"[ResearchParser] Extraction error: {e}")
            return {"error": str(e), "raw_text": ""}

        print(f"[ResearchParser] Extracted {len(text)} chars")
        
        # Basic metadata extraction
        title = self._extract_title(text)
        
        return {
            "source_type": "research",
            "raw_text": text,
            "title": title,
            "char_count": len(text),
            "extraction_method": "pymupdf"
        }
    
    def _extract_title(self, text):
        """Try to extract paper title from first few lines"""
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        if lines:
            # Usually title is in first 5 lines, longest line
            candidates = lines[:5]
            candidates.sort(key=len, reverse=True)
            return candidates[0][:200] if candidates else "Unknown"
        return "Unknown"

class GitHubParser:
    """Extract GitHub data via API - NO LLM needed (pure API)"""
    
    def __init__(self, github_token=None):
        self.github_token = github_token
        
    def parse(self, username):
        """Parse GitHub username or URL."""
        # Clean username
        if 'github.com/' in username:
            username = username.split('github.com/')[-1].strip('/')
        username = username.strip()
        
        print(f"[GitHubParser] Fetching user: {username}")
        
        # Setup headers with optional authentication
        headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'DeepTech-Expert-Scorer'
        }
        if self.github_token:
            headers['Authorization'] = f'token {self.github_token}'
        
        try:
            # Fetch user data
            response = requests.get(f"https://api.github.com/users/{username}", headers=headers, timeout=10)
            response.raise_for_status()
            user_data = response.json()
            
            # Fetch repos
            repos_response = requests.get(f"https://api.github.com/users/{username}/repos?per_page=100", headers=headers, timeout=10)
            repos_response.raise_for_status()
            repos = repos_response.json()
            
            # Calculate stats
            total_stars = sum(repo.get('stargazers_count', 0) for repo in repos)
            languages = [repo.get('language') for repo in repos if repo.get('language')]
            
            # Count languages
            from collections import Counter
            language_counts = Counter(languages)
            # Return as dict with counts for compatibility
            languages_dict = dict(language_counts.most_common(10))
            
            # Get top repos
            sorted_repos = sorted(repos, key=lambda x: x.get('stargazers_count', 0), reverse=True)[:10]
            top_repos = [
                {
                    "name": repo.get('name', ''),
                    "description": repo.get('description', '')[:100] if repo.get('description') else '',
                    "stars": repo.get('stargazers_count', 0),
                    "language": repo.get('language', ''),
                    "url": repo.get('html_url', '')
                }
                for repo in sorted_repos
            ]
            
            result = {
                "source_type": "github",
                "username": username,
                "name": user_data.get('name', ''),
                "bio": user_data.get('bio', ''),
                "location": user_data.get('location', ''),
                "company": user_data.get('company', ''),
                "repos_count": len(repos),
                "total_stars": total_stars,
                "followers": user_data.get('followers', 0),
                "following": user_data.get('following', 0),
                "languages": languages_dict,
                "top_repos": top_repos,
                "profile_url": user_data.get('html_url', ''),
                "created_at": user_data.get('created_at', ''),
                "extraction_method": "github_api"
            }
            
            print(f"[GitHubParser] Success: {len(repos)} repos, {total_stars} stars, languages: {list(languages_dict.keys())[:3]}")
            return result
            
        except Exception as e:
            print(f"[GitHubParser] Error: {e}")
            return {"error": str(e), "source_type": "github"}

class EngagementCrawler:
    """Extract community engagement data - NO LLM"""
    
    def parse(self, url):
        try:
            downloaded = trafilatura.fetch_url(url)
            if not downloaded:
                return {"error": "Fetch failed", "raw_text": ""}
            
            text = trafilatura.extract(downloaded, favor_recall=True)
            
            return {
                "source_type": "engagement",
                "source_url": url,
                "raw_text": text if text else "",
                "char_count": len(text) if text else 0,
                "extraction_method": "trafilatura"
            }
        except Exception as e:
            return {"error": str(e), "raw_text": ""}
