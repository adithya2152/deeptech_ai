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
        Extract structured data from this Resume, paying special attention to PROFESSIONAL EXPERIENCE.
        
        CRITICAL: Calculate years_experience by analyzing work history dates.
        - Look for job titles, company names, and date ranges (e.g., "June 2023 - Aug 2023")
        - Sum up all work experience duration
        - Include internships and full-time roles
        
        Return ONLY valid JSON with these keys:
        {{
            "name": "string",
            "years_experience": float (total years of work experience, including internships as fractions),
            "skills": ["list", "of", "strings"],
            "skill_count": int,
            "certifications": ["list", "of", "strings"],
            "certification_count": int,
            "projects": ["list", "of", "project", "names"],
            "work_history": [
                {{"company": "string", "role": "string", "duration": "string"}}
            ]
        }}
        Resume Text: {text[:15000]}
        """
        data = self._generate_with_retry(prompt)
        return data if data else {"name": "Unknown", "years_experience": 0, "skill_count": 0}

# 2. Web Resume Parser (IMPROVED)
class WebResumeParser(BaseParser):
    def parse(self, url):
        try:
            # Try multiple methods to get content
            text = self._fetch_with_trafilatura(url)
            
            if not text or len(text) < 100:
                text = self._fetch_with_requests(url)
            
            if not text or len(text) < 100:
                return {"error": "Could not extract meaningful content from URL", "skills": []}
            
            prompt = f"""
            Analyze this portfolio/website content as a Professional Profile.
            Extract ALL technical skills, tools, and technologies mentioned.
            
            CRITICAL: Look for:
            - Programming languages
            - Frameworks and libraries
            - Tools and platforms
            - Technical skills section
            - Project descriptions
            
            Return ONLY valid JSON:
            {{
                "name": "string",
                "years_experience": float (estimate based on career timeline or experience level),
                "skills": ["list", "of", "ALL", "technical", "skills", "found"],
                "skill_count": int,
                "certifications": ["list", "of", "strings"],
                "certification_count": int,
                "projects": ["list", "of", "projects"],
                "summary": "brief professional summary"
            }}
            Website Text: {text[:15000]}
            """
            data = self._generate_with_retry(prompt)
            
            if data:
                data["full_text"] = text
            
            return data if data else {"name": "Unknown", "years_experience": 0, "skill_count": 0, "skills": []}
        except Exception as e:
            return {"error": str(e), "skills": []}
    
    def _fetch_with_trafilatura(self, url):
        """Primary method using trafilatura"""
        try:
            downloaded = trafilatura.fetch_url(url)
            if downloaded:
                return trafilatura.extract(downloaded, include_comments=False, include_tables=True)
        except:
            pass
        return None
    
    def _fetch_with_requests(self, url):
        """Fallback method using requests + basic parsing"""
        try:
            import requests
            from bs4 import BeautifulSoup
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            text = soup.get_text()
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            return '\n'.join(chunk for chunk in chunks if chunk)
        except:
            pass
        return None

# 3. Research Parser (UPDATED FOR URLS AND TITLES)
class ResearchParser(BaseParser):
    def parse(self, text):
        # Check if input is a URL
        if text.strip().startswith('http'):
            # Fetch the paper content
            try:
                downloaded = trafilatura.fetch_url(text.strip())
                if downloaded:
                    paper_text = trafilatura.extract(downloaded)
                    text = paper_text if paper_text else text
            except:
                pass
        
        prompt = f"""
        Analyze this text for Research Output and Publications.
        
        This could be:
        1. A list of paper titles
        2. A research paper URL or content
        3. Publication listings
        
        CRITICAL: 
        - Extract actual paper/patent titles if present
        - Count number of publications
        - Identify research domain/focus
        
        Return ONLY valid JSON:
        {{
            "paper_count": int (count of papers/publications found),
            "patent_count": int,
            "titles": ["List of actual paper titles found"],
            "summary": "1-2 sentence summary of research focus area",
            "research_domains": ["domain1", "domain2"]
        }}
        Text: {text[:10000]}
        """
        data = self._generate_with_retry(prompt)
        return data if data else {"paper_count": 0, "patent_count": 0, "titles": [], "summary": ""}

# 4. GitHub Parser
class GitHubParser(BaseParser):
    def __init__(self, api_key, github_token=None):
        super().__init__(api_key)
        self.github_token = github_token
        self.headers = {}
        if github_token:
            self.headers["Authorization"] = f"token {github_token}"
    
    def parse(self, username):
        """Parse GitHub username and extract profile data."""
        # Try API first
        data = self._fetch_github_api(username)
        
        # Fallback to web scraping
        if not data:
            data = self._fetch_github_web(username)
        
        return data if data else {"error": "Could not fetch GitHub data"}
    
    def _fetch_github_api(self, username):
        """Fetch data using GitHub REST API."""
        try:
            import requests
            
            # Get user info
            user_url = f"https://api.github.com/users/{username}"
            user_response = requests.get(user_url, headers=self.headers, timeout=10)
            
            if user_response.status_code != 200:
                return None
            
            user_data = user_response.json()
            
            # Get repos
            repos_url = f"https://api.github.com/users/{username}/repos?per_page=100"
            repos_response = requests.get(repos_url, headers=self.headers, timeout=10)
            repos = repos_response.json() if repos_response.status_code == 200 else []
            
            # Calculate metrics
            total_stars = sum(repo.get('stargazers_count', 0) for repo in repos)
            languages = [repo.get('language') for repo in repos if repo.get('language')]
            language_counts = {}
            for lang in languages:
                language_counts[lang] = language_counts.get(lang, 0) + 1
            
            top_languages = sorted(language_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            
            # Get top repos by stars
            top_repos = sorted(repos, key=lambda x: x.get('stargazers_count', 0), reverse=True)[:5]
            top_repo_names = [repo.get('name', '') for repo in top_repos]
            
            # IMPORTANT: Extract skills from languages
            skills_from_languages = [lang for lang, _ in top_languages]
            
            return {
                "github_repos": user_data.get('public_repos', 0),
                "github_stars": total_stars,
                "github_followers": user_data.get('followers', 0),
                "github_languages": skills_from_languages,
                "skills": skills_from_languages,  # Add skills field
                "top_projects": top_repo_names,
                "github_bio": user_data.get('bio', ''),
                "github_commits": len(repos) * 10,  # Rough estimate
                "github_summary": f"{username} has {len(repos)} repos with {total_stars} total stars"
            }
            
        except Exception as e:
            print(f"GitHub API error: {e}")
            return None
    
    def _fetch_github_web(self, username):
        """Fallback to web scraping if API fails."""
        try:
            url = f"https://github.com/{username}"
            downloaded = trafilatura.fetch_url(url)
            if not downloaded:
                return None
            
            text = trafilatura.extract(downloaded)
            
            prompt = f"""
            Extract GitHub profile metrics from this text.
            Return ONLY valid JSON:
            {{
                "github_repos": int,
                "github_stars": int (total stars across all repos),
                "github_followers": int,
                "github_languages": ["list", "of", "programming", "languages"],
                "skills": ["list", "of", "programming", "languages"],
                "top_projects": ["repo1", "repo2"],
                "github_summary": "brief summary"
            }}
            Text: {text[:5000]}
            """
            data = self._generate_with_retry(prompt)
            return data
            
        except Exception as e:
            print(f"GitHub web scraping error: {e}")
            return None

# 5. Engagement Crawler
class EngagementCrawler(BaseParser):
    def parse(self, urls):
        combined_text = ""
        for url in urls:
            try:
                downloaded = trafilatura.fetch_url(url)
                if downloaded:
                    text = trafilatura.extract(downloaded)
                    combined_text += f"\n---URL: {url}---\n{text}\n"
            except:
                continue
        
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
