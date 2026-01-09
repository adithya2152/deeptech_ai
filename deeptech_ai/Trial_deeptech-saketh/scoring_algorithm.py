"""
Optimized Expert Scoring System with Sentence Transformers + Agentic Chunking
Uses pretrained models for semantic skill matching and Gemini for structural parsing.

Best for: Production use with high accuracy
Model: all-MiniLM-L6-v2 (80MB) + Gemini 1.5 Flash
"""

import json
import re
import os
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

# ==========================================
# 1. AI & NLP LIBRARIES
# ==========================================

# Google Gemini (For Agentic Chunking)
try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False
    print("⚠️ google-generativeai not installed. Run: pip install google-generativeai")

# Sentence Transformers (For Semantic Matching)
try:
    from sentence_transformers import SentenceTransformer, util
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False
    print("⚠️ sentence-transformers not installed. Install: pip install sentence-transformers")

# SpaCy (For NER)
try:
    import spacy
    HAS_SPACY = True
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        print("⚠️ spaCy model not found. Run: python -m spacy download en_core_web_sm")
        HAS_SPACY = False
except ImportError:
    HAS_SPACY = False
    print("⚠️ spaCy not installed. Install: pip install spacy")

# ==========================================
# 2. DOCUMENT PROCESSING LIBRARIES
# ==========================================

# PDF
try:
    import fitz  # PyMuPDF
    HAS_PDF = True
except ImportError:
    HAS_PDF = False

# DOCX
try:
    from docx import Document
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

# Website/URL
try:
    import trafilatura
    from trafilatura.settings import Extractor
    HAS_TRAFILATURA = True
except ImportError:
    HAS_TRAFILATURA = False


@dataclass
class ScoreComponents:
    """Individual score components"""
    expertise_score: float = 0.0
    performance_score: float = 0.0
    reliability_score: float = 0.0
    quality_score: float = 0.0
    engagement_score: float = 0.0
    resume_score: float = 0.0
    overall_score: float = 0.0

# ==========================================
# 3. NEW: AGENTIC CHUNKING CLASS
# ==========================================

class GeminiResumeChunker:
    """
    Uses Google Gemini to intelligently split a resume into semantic sections.
    This removes noise (headers, footers, legal text) before scoring.
    """
    def __init__(self, api_key: str):
        if not HAS_GEMINI:
            raise ImportError("Google Generative AI library is missing.")
        
        genai.configure(api_key=api_key)
        # Using 1.5 Flash for speed and cost-efficiency
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def chunk_resume(self, full_text: str) -> Dict[str, str]:
        print("🤖 Gemini Agent is analyzing document structure...")
        
        prompt = f"""
        You are an expert Resume Parser. Analyze the text below and extract content into these specific JSON sections.
        
        Rules:
        1. "WORK_EXPERIENCE": Combine all job history into one string.
        2. "SKILLS": Extract technical skills, languages, tools.
        3. "EDUCATION": Extract degrees, universities.
        4. "PROJECTS": Extract project descriptions.
        5. "SUMMARY": Extract professional summary.
        6. Return ONLY valid JSON.
        
        Text:
        {full_text[:12000]} 
        """

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            # Clean potential markdown
            text_resp = response.text.strip()
            if text_resp.startswith("```json"): text_resp = text_resp[7:-3]
            elif text_resp.startswith("```"): text_resp = text_resp[3:-3]
            
            return json.loads(text_resp)
        except Exception as e:
            print(f"⚠️ Agentic chunking failed: {e}. Using raw text.")
            # Fallback structure
            return {"FULL_TEXT": full_text}


class DocumentProcessor:
    """Extract text from PDF, DOCX, TXT"""
    
    @staticmethod
    def extract_text_from_pdf(file_path: str) -> str:
        if not HAS_PDF:
            raise ImportError("PyMuPDF not installed. Install: pip install PyMuPDF")
        text = ""
        with fitz.open(file_path) as doc:
            for page in doc:
                text += page.get_text()
        return text
    
    @staticmethod
    def extract_text_from_docx(file_path: str) -> str:
        if not HAS_DOCX:
            raise ImportError("python-docx not installed. Install: pip install python-docx")
        doc = Document(file_path)
        return "\n".join([p.text for p in doc.paragraphs])
    
    @staticmethod
    def extract_text_from_txt(file_path: str) -> str:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    @staticmethod
    def extract_text_from_url(url: str) -> str:
        if not HAS_TRAFILATURA:
            raise ImportError("Trafilatura not installed. Install: pip install trafilatura")
        
        extract_options = Extractor(
            output_format="txt",
            with_metadata=False,
            lang="en",
            comments=False,
            tables=True,
            links=False,
            dedup=True
        )
        
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            raise ValueError(f"Could not fetch content from URL: {url}")
        
        result_text = trafilatura.extract(downloaded, options=extract_options)
        if not result_text:
            raise ValueError(f"No text extracted from URL: {url}")
        
        return result_text
    
    @staticmethod
    def process_document(file_path: str) -> str:
        """Auto-detect and extract text from document or URL"""
        if file_path.startswith(('http://', 'https://')):
            print(f"🌐 Processing URL: {file_path}...")
            text = DocumentProcessor.extract_text_from_url(file_path)
        else:
            file_path_obj = Path(file_path)
            if not file_path_obj.exists():
                 # Fallback for raw text string input during testing
                if len(file_path) > 50: return file_path
                raise FileNotFoundError(f"File not found: {file_path}")
            
            ext = file_path_obj.suffix.lower()
            print(f"📄 Processing {file_path_obj.name} ({ext})...")
            
            if ext == '.pdf':
                text = DocumentProcessor.extract_text_from_pdf(str(file_path_obj))
            elif ext == '.docx':
                text = DocumentProcessor.extract_text_from_docx(str(file_path_obj))
            elif ext == '.txt':
                text = DocumentProcessor.extract_text_from_txt(str(file_path_obj))
            else:
                raise ValueError(f"Unsupported format: {ext}")
        
        print(f"✅ Extracted {len(text)} characters")
        return text


class SemanticSkillMatcher:
    """
    Semantic skill matching using Sentence Transformers
    Model: all-MiniLM-L6-v2
    """
    
    SKILL_DATABASE = [
        'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 
        'Scala', 'Kotlin', 'Swift', 'R', 'MATLAB', 'Julia', 'PHP', 'Ruby',
        'PyTorch', 'TensorFlow', 'Keras', 'scikit-learn', 'JAX', 'MXNet', 
        'Caffe', 'XGBoost', 'LightGBM', 'CatBoost', 'Hugging Face Transformers',
        'React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt', 'Django', 
        'Flask', 'FastAPI', 'Express.js', 'Spring Boot', 'ASP.NET',
        'AWS', 'Amazon Web Services', 'Azure', 'Google Cloud Platform', 'GCP', 
        'Heroku', 'DigitalOcean', 'Vercel', 'Netlify', 'Cloudflare',
        'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 
        'Cassandra', 'DynamoDB', 'Neo4j', 'SQLite', 'Oracle Database',
        'Docker', 'Kubernetes', 'Jenkins', 'Git', 'GitHub Actions', 'GitLab CI',
        'Terraform', 'Ansible', 'Grafana', 'Prometheus', 'Kafka', 'Airflow', 'Spark',
        'Deep Learning', 'Machine Learning', 'Natural Language Processing', 
        'Computer Vision', 'Reinforcement Learning', 'Neural Networks',
        'Convolutional Neural Networks', 'Transformers', 'BERT', 'GPT',
        'Robotics', 'Quantum Computing', 'Blockchain', 'Embedded Systems',
        'Real-time Systems', 'Distributed Systems', 'Microservices'
    ]
    
    EDUCATION_PATTERNS = [
        (r'ph\.?d\.?|doctor of philosophy|doctoral', 4, 'PhD'),
        (r'master|m\.?s\.?|m\.?tech|m\.?a\.?|mba', 3, 'Master'),
        (r'bachelor|b\.?s\.?|b\.?tech|b\.?e\.?|b\.?a\.?', 2, 'Bachelor'),
    ]
    
    CERTIFICATION_PATTERNS = [
        r'aws certified', r'google cloud certified', r'microsoft certified',
        r'certified .+ professional', r'professional certificate',
        r'coursera|udacity|edx', r'certification in'
    ]
    
    def __init__(self):
        if HAS_SENTENCE_TRANSFORMERS:
            print("🤖 Loading Sentence Transformer model (all-MiniLM-L6-v2)...")
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            self.skill_embeddings = self.model.encode(self.SKILL_DATABASE, convert_to_tensor=True, show_progress_bar=False)
            print("✅ Model loaded and ready!")
        else:
            print("⚠️ Sentence Transformers not available. Falling back to keyword matching.")
            self.model = None
            self.skill_embeddings = None
    
    def extract_skills_semantic(self, resume_text: str, threshold: float = 0.5) -> List[Tuple[str, float]]:
        if not HAS_SENTENCE_TRANSFORMERS or self.model is None:
            return self._extract_skills_fallback(resume_text)
        
        # Clean text slightly to help splitting
        clean_text = resume_text.replace("•", "\n").replace("|", "\n")
        sentences = [s.strip() for s in clean_text.split('\n') if len(s.strip()) > 3]
        
        if not sentences:
            return []
        
        sentence_embeddings = self.model.encode(sentences, convert_to_tensor=True)
        similarities = util.pytorch_cos_sim(sentence_embeddings, self.skill_embeddings)
        
        found_skills = {} # Use dict to store max score per skill
        
        for i in range(len(sentences)):
            for skill_idx, skill in enumerate(self.SKILL_DATABASE):
                score = similarities[i, skill_idx].item()
                if score >= threshold:
                    if skill not in found_skills or score > found_skills[skill]:
                        found_skills[skill] = score
        
        # Convert to list and sort
        result = list(found_skills.items())
        result.sort(key=lambda x: x[1], reverse=True)
        return result
    
    def _extract_skills_fallback(self, resume_text: str) -> List[Tuple[str, float]]:
        text_lower = resume_text.lower()
        found_skills = []
        for skill in self.SKILL_DATABASE:
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, text_lower):
                found_skills.append((skill, 1.0))
        return found_skills
    
    def extract_education(self, resume_text: str) -> Tuple[int, str]:
        text_lower = resume_text.lower()
        for pattern, level, name in self.EDUCATION_PATTERNS:
            if re.search(pattern, text_lower):
                return level, name
        return 1, 'High School'
    
    def count_certifications(self, resume_text: str) -> int:
        text_lower = resume_text.lower()
        count = 0
        for pattern in self.CERTIFICATION_PATTERNS:
            matches = re.findall(pattern, text_lower)
            count += len(matches)
        return count
    
    def extract_years_experience(self, resume_text: str) -> Optional[int]:
        patterns = [
            r'(\d+)\+?\s*years?\s+(?:of\s+)?experience',
            r'(\d+)\+?\s*yrs?\s+experience',
            r'experience:\s*(\d+)\+?\s*years?'
        ]
        for pattern in patterns:
            match = re.search(pattern, resume_text.lower())
            if match:
                return int(match.group(1))
        return None
    
    def extract_entities_spacy(self, resume_text: str) -> Dict[str, List[str]]:
        if not HAS_SPACY:
            return {'persons': [], 'organizations': [], 'dates': []}
        try:
            doc = nlp(resume_text[:100000])
            entities = {'persons': [], 'organizations': [], 'dates': []}
            for ent in doc.ents:
                if ent.label_ == 'PERSON': entities['persons'].append(ent.text)
                elif ent.label_ == 'ORG': entities['organizations'].append(ent.text)
                elif ent.label_ == 'DATE': entities['dates'].append(ent.text)
            return entities
        except Exception:
            # Fallback if spaCy processing fails
            return {'persons': [], 'organizations': [], 'dates': []}
    
    def analyze_resume_complete(self, resume_text: str, declared_skills: List[str] = None) -> Dict[str, Any]:
        if declared_skills is None: declared_skills = []
        
        skills_with_scores = self.extract_skills_semantic(resume_text, threshold=0.5)
        extracted_skills = [skill for skill, _ in skills_with_scores]
        
        education_level, education_name = self.extract_education(resume_text)
        cert_count = self.count_certifications(resume_text)
        years_exp = self.extract_years_experience(resume_text)
        entities = self.extract_entities_spacy(resume_text) if HAS_SPACY else {}
        
        # Skill verification
        if declared_skills:
            verified_count = sum(1 for skill in declared_skills if any(skill.lower() in extracted.lower() for extracted in extracted_skills))
            verification_rate = (verified_count / len(declared_skills)) * 100
        else:
            verification_rate = 100.0
        
        skill_diversity = len(set([s.split()[0] for s, _ in skills_with_scores]))
        quality_score = min(100, (len(extracted_skills) * 2 + education_level * 10 + cert_count * 5 + (years_exp or 0) * 3 + verification_rate * 0.3 + skill_diversity * 2))
        
        return {
            'method': 'Sentence Transformers' if HAS_SENTENCE_TRANSFORMERS else 'Keyword Matching',
            'model': 'all-MiniLM-L6-v2' if HAS_SENTENCE_TRANSFORMERS else 'None',
            'skills_with_confidence': skills_with_scores[:20],
            'extracted_skills': extracted_skills,
            'skill_count': len(extracted_skills),
            'skill_diversity': skill_diversity,
            'education_level': education_level,
            'education_name': education_name,
            'certifications_count': cert_count,
            'years_experience': years_exp,
            'skill_verification_rate': verification_rate,
            'entities': entities,
            'resume_quality_score': quality_score,
            'text_length': len(resume_text)
        }


class ExpertScoringSystem:
    """Enhanced scoring with semantic analysis"""
    
    def __init__(self, expert_data: Dict[str, Any], resume_file: Optional[str] = None, gemini_api_key: Optional[str] = None):
        self.expert = expert_data
        self.scores = ScoreComponents()
        self.matcher = SemanticSkillMatcher()
        
        # Initialize Agentic Chunker if key provided
        self.chunker = GeminiResumeChunker(gemini_api_key) if gemini_api_key and HAS_GEMINI else None
        self.chunks = {}
        
        # Process resume if provided
        if resume_file:
            resume_text = DocumentProcessor.process_document(resume_file)
            
            # --- AGENTIC CHUNKING LOGIC ---
            if self.chunker:
                self.chunks = self.chunker.chunk_resume(resume_text)
                
                # [FIXED] SAFE STRING JOINING (Handles None/null values)
                parts = [
                    self.chunks.get('SUMMARY') or "",
                    self.chunks.get('WORK_EXPERIENCE') or "",
                    self.chunks.get('SKILLS') or "",
                    self.chunks.get('EDUCATION') or "",
                    self.chunks.get('PROJECTS') or ""
                ]
                clean_text = "\n".join(parts)
                
                # Check if we actually got text, otherwise fallback
                if len(clean_text.strip()) > 50: 
                    self.expert['resume_text'] = clean_text
                else:
                    print("⚠️ Agent returned empty sections. Using raw text.")
                    self.expert['resume_text'] = resume_text 
            else:
                self.expert['resume_text'] = resume_text
    
    def calculate_expertise_score(self) -> float:
        """Calculate expertise (0-100)"""
        score = 0.0
        
        # Years of experience (0-15 pts)
        years_exp = self.expert.get('years_experience', 0)
        score += min(years_exp / 10 * 15, 15)
        
        # Skills (0-10 pts)
        skill_count = len(self.expert.get('skills', []))
        score += min(skill_count * 1.5, 10)
        
        # Resume analysis (0-20 pts)
        if 'resume_text' in self.expert:
            analysis = self.matcher.analyze_resume_complete(
                self.expert['resume_text'],
                self.expert.get('skills', [])
            )
            cert_count = analysis['certifications_count']
            score += min(cert_count * 5, 20)
        
        # Publications (0-20 pts)
        papers = len(self.expert.get('papers', []))
        patents = len(self.expert.get('patents', []))
        products = len(self.expert.get('products', []))
        score += min((papers + patents + products) * 2, 20)
        
        # Vetting level (0-35 pts)
        vetting_level = self.expert.get('vetting_level', 'general')
        vetting_points = {
            'deep_tech_verified': 35,
            'advanced': 25,
            'general': 15,
            'mid': 10
        }
        score += vetting_points.get(vetting_level, 0)
        
        return min(100, score)
    
    def calculate_performance_score(self) -> float:
        """Performance score (0-100)"""
        score = 0.0
        total_contracts = self.expert.get('total_contracts', 0)
        completed_contracts = self.expert.get('completed_contracts', 0)
        
        if total_contracts == 0:
            return 0.0
        
        # Completion rate (0-40 pts)
        completion_rate = (completed_contracts / total_contracts) * 100
        score += (completion_rate / 100) * 40
        
        # On-time delivery (0-35 pts) - assuming 90% if not provided
        on_time_rate = self.expert.get('on_time_delivery_rate', 0.9) * 100
        score += (on_time_rate / 100) * 35
        
        # Milestone achievement (0-25 pts) - assuming 85% if not provided
        milestone_rate = self.expert.get('milestone_completion_rate', 0.85) * 100
        score += (milestone_rate / 100) * 25
        
        return min(100, score)
    
    def calculate_reliability_score(self) -> float:
        """Reliability score (0-100)"""
        score = 100.0  # Start at perfect
        
        # Disputes (penalty)
        disputes = self.expert.get('disputes', 0)
        score -= disputes * 15
        
        # Cancellations (penalty)
        cancellations = self.expert.get('cancellations', 0)
        score -= cancellations * 10
        
        # Response time bonus
        avg_response_hours = self.expert.get('avg_response_time_hours', 24)
        if avg_response_hours < 2:
            score += 5
        elif avg_response_hours < 6:
            score += 3
        
        return max(0, min(100, score))
    
    def calculate_quality_score(self) -> float:
        """Quality score (0-100)"""
        rating = self.expert.get('rating', 0)
        review_count = self.expert.get('review_count', 0)
        
        if review_count == 0:
            return 0.0
        
        # Base rating score (0-80 pts)
        score = (rating / 5.0) * 80
        
        # Review count bonus (0-20 pts)
        review_bonus = min(review_count * 2, 20)
        score += review_bonus
        
        return min(100, score)
    
    def calculate_engagement_score(self) -> float:
        """Engagement score (0-100)"""
        score = 0.0
        
        # Messages sent (0-40 pts)
        messages = self.expert.get('messages_sent', 0)
        score += min(messages * 2, 40)
        
        # Proposals submitted (0-30 pts)
        proposals = self.expert.get('proposals_submitted', 0)
        score += min(proposals * 3, 30)
        
        # Community participation (0-30 pts)
        articles = self.expert.get('articles_published', 0)
        webinars = self.expert.get('webinars_conducted', 0)
        score += min((articles + webinars) * 5, 30)
        
        return min(100, score)
    
    def calculate_resume_score(self) -> float:
        """AI-powered resume score (0-100)"""
        if 'resume_text' not in self.expert:
            return 0.0
        
        analysis = self.matcher.analyze_resume_complete(
            self.expert['resume_text'],
            self.expert.get('skills', [])
        )
        
        return analysis['resume_quality_score']
    
    def calculate_all_scores(self) -> ScoreComponents:
        """Calculate all components"""
        self.scores.expertise_score = self.calculate_expertise_score()
        self.scores.performance_score = self.calculate_performance_score()
        self.scores.reliability_score = self.calculate_reliability_score()
        self.scores.quality_score = self.calculate_quality_score()
        self.scores.engagement_score = self.calculate_engagement_score()
        self.scores.resume_score = self.calculate_resume_score()
        
        # Weighted overall score
        self.scores.overall_score = (
            self.scores.expertise_score * 0.23 +
            self.scores.performance_score * 0.28 +
            self.scores.reliability_score * 0.23 +
            self.scores.quality_score * 0.14 +
            self.scores.engagement_score * 0.05 +
            self.scores.resume_score * 0.07
        )
        
        return self.scores
    
    def get_rank_tier(self, score: float) -> Tuple[str, str]:
        """Determine rank tier from score"""
        if score == 100: return "DeepTech Pioneer", "🏆"
        elif score >= 98: return "Legendary Contributor", "👑"
        elif score >= 93: return "Industry Leader", "⭐"
        elif score >= 87: return "Master Practitioner", "💎"
        elif score >= 80: return "Senior Expert", "🔷"
        elif score >= 70: return "Verified Specialist", "✅"
        elif score >= 60: return "Established Professional", "🎓"
        elif score >= 50: return "Qualified Contributor", "📘"
        elif score >= 40: return "Emerging Talent", "🌱"
        else: return "Newcomer", "🆕"
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive scoring report"""
        scores = self.calculate_all_scores()
        tier_name, tier_emoji = self.get_rank_tier(scores.overall_score)
        
        report = {
            'expert_id': self.expert.get('id'),
            'expert_name': self.expert.get('name'),
            'timestamp': datetime.now().isoformat(),
            'overall_score': round(scores.overall_score, 2),
            'rank_tier': tier_name,
            'tier_emoji': tier_emoji,
            'score_breakdown': {
                'expertise': round(scores.expertise_score, 2),
                'performance': round(scores.performance_score, 2),
                'reliability': round(scores.reliability_score, 2),
                'quality': round(scores.quality_score, 2),
                'engagement': round(scores.engagement_score, 2),
                'resume': round(scores.resume_score, 2)
            }
        }
        
        # Add resume analysis if available
        if 'resume_text' in self.expert:
            analysis = self.matcher.analyze_resume_complete(
                self.expert['resume_text'],
                self.expert.get('skills', [])
            )
            report['resume_analysis'] = {
                'method': analysis['method'],
                'model': analysis['model'],
                'skills_found': analysis['skill_count'],
                'top_skills': [f"{skill} ({score:.2f})" for skill, score in analysis['skills_with_confidence'][:10]],
                'education': analysis['education_name'],
                'certifications': analysis['certifications_count'],
                'years_experience': analysis['years_experience'],
                'verification_rate': f"{analysis['skill_verification_rate']:.1f}%"
            }
            if self.chunks:
                report['agentic_chunks_detected'] = list(self.chunks.keys())
        
        return report

# ==========================================
# 4. EXECUTION
# ==========================================

def main():
    """Demo with semantic skill matching + Agentic Chunking"""
    
    print("\n" + "="*80)
    print("🚀 Optimized Expert Scoring + Agentic Chunking")
    print("="*80 + "\n")
    
    # ------------------------------------------------------------------
    # ENTER GEMINI KEY HERE
    # ------------------------------------------------------------------
    GEMINI_API_KEY = ""
    # ------------------------------------------------------------------
    
    # Dummy Expert Data (Simulating DB record)
    dummy_expert = {
        "id": "exp_001",
        "name": "Dr. Sarah Connor",
        "years_experience": 8,
        "skills": ["Python", "AI", "Robotics"],
        "papers": ["Paper A", "Paper B"],
        "patents": [],
        "products": ["Skynet v1"],
        "vetting_level": "advanced",
        "total_contracts": 10,
        "completed_contracts": 10,
        "on_time_delivery_rate": 0.95,
        "milestone_completion_rate": 0.98,
        "disputes": 0,
        "cancellations": 0,
        "avg_response_time_hours": 1,
        "rating": 4.9,
        "review_count": 15,
        "messages_sent": 100,
        "proposals_submitted": 20,
        "articles_published": 2,
        "webinars_conducted": 1
    }
    
    # Dummy Resume Text (Simulating a file)
    dummy_resume = """
    Sarah Connor. 
    Summary: Experienced AI Researcher.
    Work Experience: 
    Cyberdyne Systems (2020-2024): Lead Robotics Engineer. Used Python, C++, and ROS to build autonomous units.
    Education: PhD in Computer Science, MIT.
    Skills: Python, C++, TensorFlow, Docker, Kubernetes.
    """

    print("📊 Processing Expert...")
    
    if not GEMINI_API_KEY == "":
        print("⚠️  No Gemini API Key provided. Running in Standard Mode (No Agentic Chunking).")
        system = ExpertScoringSystem(dummy_expert, dummy_resume)
    else:
        print("🤖 Running in Agentic Mode (Gemini Enabled).")
        system = ExpertScoringSystem(dummy_expert, dummy_resume, gemini_api_key=GEMINI_API_KEY)

    report = system.generate_report()
    
    print(f"\n{'='*80}")
    print(f"👤 {report['expert_name']}")
    print(f"{'='*80}")
    print(f"Overall Score: {report['overall_score']}/100")
    print(f"Rank Tier: {report['rank_tier']} {report['tier_emoji']}")
    
    print(f"\nScore Breakdown:")
    for component, score in report['score_breakdown'].items():
        print(f"  • {component.capitalize():12} {score:6.2f}/100")
    
    if 'resume_analysis' in report:
        print(f"\n📄 Resume Analysis:")
        print(f"  • Education: {report['resume_analysis']['education']}")
        print(f"  • Skills Found: {report['resume_analysis']['skills_found']}")
        if report['resume_analysis']['top_skills']:
            print(f"  • Top Skills: {', '.join(report['resume_analysis']['top_skills'][:5])}")
    
    if 'agentic_chunks_detected' in report:
        print(f"\n🤖 Agentic Chunks Used: {report['agentic_chunks_detected']}")

if __name__ == "__main__":
    main()