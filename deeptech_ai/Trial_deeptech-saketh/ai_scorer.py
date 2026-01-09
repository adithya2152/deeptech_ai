# ai_scorer.py
from openai import OpenAI
import json
import re

class AIScorer:
    """
    LLM-based scoring engine using OpenRouter API (free tier).
    Evaluates candidates holistically with natural language reasoning.
    """
    
    def __init__(self, api_key):
        if not api_key:
            raise ValueError("API Key is required for AI Scorer")
        
        # Initialize OpenRouter client (OpenAI-compatible)
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        # Use free tier model: google/gemini-2.0-flash-exp:free
        self.model = "google/gemini-2.0-flash-exp:free"
    
    def _clean_json_response(self, text):
        """Extract JSON from markdown code blocks or raw text"""
        text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'```$', '', text, flags=re.MULTILINE)
        try:
            return json.loads(text.strip())
        except:
            match = re.search(r'\{[\s\S]*\}', text)
            if match:
                try:
                    return json.loads(match.group())
                except:
                    pass
            return None
    
    def score_candidate(self, candidate_profile, job_description="", contracts_count=0):
        """
        Score candidate using AI with detailed reasoning.
        
        Args:
            candidate_profile: Aggregated profile dict with all candidate data
            job_description: Optional job requirements for context
            contracts_count: Number of contracts completed (for tier calculation)
        
        Returns:
            Dict with scores and reasoning
        """
        
        # Extract real-world projects from profile
        work_history = candidate_profile.get('work_history', [])
        projects = candidate_profile.get('projects', [])
        research_titles = candidate_profile.get('research_titles', [])
        top_repos = candidate_profile.get('top_projects', [])
        
        prompt = f"""You are a DeepTech hiring consultant preparing a recommendation memo for an admin/hiring manager.

CANDIDATE PROFILE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: {candidate_profile.get('name', 'Unknown')}
Experience: {candidate_profile.get('years_experience', 0)} years
Technical Skills: {', '.join(candidate_profile.get('skills', [])[:25])}
Certifications: {candidate_profile.get('certification_count', 0)}

WORK EXPERIENCE:
{chr(10).join([f"  • {w.get('role', 'Role')} at {w.get('company', 'Company')} ({w.get('duration_months', 0)} months)" for w in work_history[:3]]) if work_history else "  • Information extracted from resume/portfolio"}

REAL-WORLD PROJECTS:
{chr(10).join([f"  • {p if isinstance(p, str) else p.get('name', 'Project')}" for p in projects[:5]]) if projects else "  • Check GitHub repositories below"}

RESEARCH & PUBLICATIONS:
  • Papers Published: {candidate_profile.get('paper_count', 0)}
{chr(10).join([f"  • {title}" for title in research_titles[:3]]) if research_titles else ""}

GITHUB PORTFOLIO:
  • Repositories: {candidate_profile.get('github_repos', 0)}
  • Primary Languages: {', '.join(candidate_profile.get('github_languages', [])[:8])}
  • Stars Received: {candidate_profile.get('github_stars', 0)}
  • Active Projects: {len(top_repos)}
{chr(10).join([f"    - {repo.get('name', '')}: {repo.get('description', 'No description')[:60]}" for repo in top_repos[:3]]) if top_repos else ""}

COMMUNITY ENGAGEMENT:
  • Stack Overflow: {candidate_profile.get('answers_count', 0)} answers, {candidate_profile.get('upvotes', 0)} upvotes
  • Technical Blogs: {candidate_profile.get('blog_post_count', 0)} posts

PLATFORM HISTORY:
  • Contracts Completed: {contracts_count}

{"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nJOB REQUIREMENTS:\n" + job_description if job_description else "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nGENERAL ASSESSMENT (No specific role specified)"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR TASK:
Prepare a hiring recommendation memo for the admin. Analyze this candidate's profile and:

1. SCORE each dimension (0-100):
   - Expertise (25%): Technical depth, certifications, research
   - Performance (30%): Project delivery, code quality, consistency
   - Reliability (25%): Profile consistency, active presence
   - Quality (15%): Code/research quality, documentation
   - Engagement (5%): Community participation, knowledge sharing

2. RECOMMEND specific roles/projects based on:
   - Their strongest technical skills
   - Real-world project experience (work history, personal projects, GitHub)
   - Research background (if applicable)
   - Years of experience level

3. JUSTIFY your recommendation with:
   - Evidence from their work history
   - Specific projects/skills alignment
   - Research contributions (if any)
   - GitHub portfolio quality

Be specific and data-driven. Reference actual skills, projects, and experience from their profile.

Return ONLY this JSON structure (no markdown):
{{
    "expertise_score": <0-100>,
    "expertise_reasoning": "<specific evidence from profile>",
    
    "performance_score": <0-100>,
    "performance_reasoning": "<reference real projects/GitHub activity>",
    
    "reliability_score": <0-100>,
    "reliability_reasoning": "<profile consistency check>",
    
    "quality_score": <0-100>,
    "quality_reasoning": "<code/research quality assessment>",
    
    "engagement_score": <0-100>,
    "engagement_reasoning": "<community involvement>",
    
    "overall_score": <weighted average>,
    
    "admin_recommendation": {{
        "decision": "<STRONGLY RECOMMEND|RECOMMEND|CONSIDER|DO NOT RECOMMEND>",
        "recommended_roles": [
            "Primary Role Title (e.g., Senior Full-Stack Developer)",
            "Alternative Role (e.g., Cloud Solutions Architect)"
        ],
        "best_fit_projects": [
            "Project type based on their experience (e.g., IoT Sensor Networks - matches their Master's thesis)",
            "Another project type (e.g., React/Node.js Web Applications - 3 months industry experience)"
        ],
        "justification": "<2-3 sentences with SPECIFIC evidence: 'Candidate has X years in Y technology, demonstrated by Z project. Their research in ABC shows expertise in DEF. GitHub shows active work in GHI with JKL stars.'>",
        "key_strengths": [
            "Specific strength with evidence (e.g., 'Strong Cloud Infrastructure skills - AWS/GCP/Azure from portfolio')",
            "Another strength (e.g., 'Published research in WSN for IoT - demonstrates domain expertise')",
            "Third strength (e.g., '17 GitHub repos in TypeScript/Python - active developer')"
        ],
        "experience_highlights": [
            "Real work: <summarize actual work experience>",
            "Personal projects: <mention specific notable projects>",
            "Research: <if applicable, cite publications>"
        ],
        "areas_for_growth": [
            "Specific gap (e.g., 'Limited production deployment experience')",
            "Another area (e.g., 'No certifications in cloud platforms despite skills listed')"
        ],
        "hiring_priority": "<HIGH|MEDIUM|LOW>",
        "suggested_interview_focus": [
            "Topic to probe in interview based on profile",
            "Another area to verify"
        ]
    }},
    
    "tier_prediction": "<Tier 1-10 based on score and contracts>"
}}"""

        try:
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            response_text = completion.choices[0].message.content
            scores = self._clean_json_response(response_text)
            
            if not scores:
                print("[AIScorer] Failed to parse JSON, using fallback scores")
                return self._fallback_scores(candidate_profile)
            
            # Validate and round scores
            for key in ['expertise_score', 'performance_score', 'reliability_score', 'quality_score', 'engagement_score', 'overall_score']:
                if key in scores:
                    scores[key] = round(float(scores[key]), 2)
            
            # Add metadata
            scores['scoring_method'] = 'AI (OpenRouter - Gemini 2.0 Flash Free)'
            scores['timestamp'] = datetime.now().isoformat()
            
            print(f"[AIScorer] Generated scores: Overall={scores.get('overall_score')}, Expertise={scores.get('expertise_score')}")
            
            return scores
            
        except Exception as e:
            print(f"[AIScorer] Error: {e}")
            return self._fallback_scores(candidate_profile)
    
    def _fallback_scores(self, profile):
        """Basic heuristic scoring if AI fails"""
        from datetime import datetime
        
        # Simple heuristics
        skill_score = min(len(profile.get('skills', [])) * 2, 70)
        exp_score = min(profile.get('years_experience', 0) * 10, 50)
        github_score = min(profile.get('github_repos', 0) * 2, 60)
        research_score = profile.get('paper_count', 0) * 10
        
        expertise = min(skill_score + exp_score + research_score, 100)
        performance = min(github_score + profile.get('github_stars', 0) * 0.5, 100)
        reliability = 75  # Default assumption
        quality = min(github_score + research_score, 100)
        engagement = min(profile.get('answers_count', 0) * 5 + profile.get('blog_post_count', 0) * 10, 100)
        
        overall = (expertise * 0.25 + performance * 0.30 + reliability * 0.25 + quality * 0.15 + engagement * 0.05)
        
        return {
            'expertise_score': round(expertise, 2),
            'expertise_reasoning': 'Fallback scoring due to AI error',
            'performance_score': round(performance, 2),
            'performance_reasoning': 'Fallback scoring due to AI error',
            'reliability_score': round(reliability, 2),
            'reliability_reasoning': 'Fallback scoring due to AI error',
            'quality_score': round(quality, 2),
            'quality_reasoning': 'Fallback scoring due to AI error',
            'engagement_score': round(engagement, 2),
            'engagement_reasoning': 'Fallback scoring due to AI error',
            'overall_score': round(overall, 2),
            'strengths': ['Data extraction successful'],
            'weaknesses': ['AI scoring unavailable'],
            'recommendation': 'CONSIDER - Manual review needed',
            'tier_prediction': 'Unknown',
            'scoring_method': 'Fallback Heuristic',
            'timestamp': datetime.now().isoformat()
        }

from datetime import datetime
