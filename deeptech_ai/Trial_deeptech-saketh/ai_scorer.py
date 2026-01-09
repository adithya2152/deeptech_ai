# ai_scorer.py - Single LLM call for complete analysis
from openai import OpenAI
import json
import re
from datetime import datetime

class AIScorer:
    """
    Single LLM call analyzer - takes aggregated JSON, returns complete evaluation.
    NO partial parsing - everything happens in one comprehensive analysis.
    """
    
    def __init__(self, api_key):
        if not api_key:
            raise ValueError("API Key is required for AI Scorer")
        
        # Initialize OpenRouter client
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        self.model = "meta-llama/llama-3.2-3b-instruct:free"
    
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
    
    def analyze_candidate(self, aggregated_data, job_description=""):
        """
        SINGLE LLM CALL - Complete analysis of aggregated candidate data.
        
        Args:
            aggregated_data: Complete JSON from aggregator with all parsed documents
            job_description: Optional job requirements
        
        Returns:
            Complete evaluation with admin recommendations, scores, and extracted structured data
        """
        
        print(f"[AIScorer] Starting single comprehensive analysis...")
        print(f"[AIScorer] Aggregated data size: {len(json.dumps(aggregated_data))} chars")
        
        # Prepare the complete aggregated JSON as a string
        aggregated_json = json.dumps(aggregated_data, indent=2)
        
        prompt = f"""You are an expert hiring analyst. Analyze this COMPLETE candidate data package and provide a comprehensive evaluation.

COMPLETE AGGREGATED CANDIDATE DATA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{aggregated_json}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{f"JOB REQUIREMENTS:\n{job_description}\n" if job_description else ""}

YOUR TASK - COMPLETE ANALYSIS IN ONE RESPONSE:

1. PARSE & STRUCTURE the raw data:
   - Extract name, email, phone from resume text
   - Identify all technical skills from ALL sources (resume, portfolio, research, GitHub)
   - Calculate total years of experience from work history dates
   - List all certifications found
   - Extract project names and descriptions
   - Identify research papers and their topics
   
2. ANALYZE & SCORE across 5 dimensions (0-100 each):
   - Expertise (25%): Technical skills depth, certifications, research publications
   - Performance (30%): Project delivery, code quality indicators, consistency
   - Reliability (25%): Profile completeness, activity consistency, GitHub commits
   - Quality (15%): Code documentation, research quality, portfolio presentation
   - Engagement (5%): Community contributions, blog posts, StackOverflow activity

3. GENERATE ADMIN RECOMMENDATION:
   - Decision: STRONGLY RECOMMEND | RECOMMEND | CONSIDER | DO NOT RECOMMEND
   - Recommended Roles: Specific job titles matching their skills/experience
   - Best Fit Projects: Types of projects they'd excel at (with evidence)
   - Hiring Justification: 2-3 sentences with SPECIFIC evidence
   - Key Strengths: Top 3-5 strengths with proof points
   - Experience Highlights: Standout work/projects/research
   - Areas for Growth: Gaps or development opportunities
   - Hiring Priority: HIGH | MEDIUM | LOW
   - Interview Focus: Topics to probe based on profile

Return ONLY valid JSON with this COMPLETE structure:

{{
  "parsed_data": {{
    "name": "Full name from resume",
    "email": "email@example.com",
    "phone": "+1234567890",
    "years_experience": 2.5,
    "all_skills": ["Python", "React", "AWS", "etc"],
    "certifications": ["Cert 1", "Cert 2"],
    "projects": [
      {{"name": "Project Name", "description": "brief desc", "technologies": ["tech1", "tech2"]}}
    ],
    "work_history": [
      {{"company": "Company", "role": "Role", "duration": "X months", "technologies": ["tech"]}}
    ],
    "research": {{
      "paper_count": 1,
      "titles": ["Paper Title"],
      "domains": ["Machine Learning", "IoT"]
    }},
    "github_summary": {{
      "repos": 17,
      "stars": 5,
      "top_languages": ["TypeScript", "Python"],
      "notable_projects": ["proj1", "proj2"]
    }}
  }},
  
  "scores": {{
    "expertise_score": 75,
    "expertise_reasoning": "Detailed explanation with evidence...",
    "performance_score": 80,
    "performance_reasoning": "Detailed explanation with evidence...",
    "reliability_score": 70,
    "reliability_reasoning": "Detailed explanation with evidence...",
    "quality_score": 65,
    "quality_reasoning": "Detailed explanation with evidence...",
    "engagement_score": 40,
    "engagement_reasoning": "Detailed explanation with evidence...",
    "overall_score": 73.5
  }},
  
  "admin_recommendation": {{
    "decision": "RECOMMEND",
    "hiring_priority": "HIGH",
    "recommended_roles": [
      "Full-Stack Developer",
      "Cloud Solutions Engineer"
    ],
    "best_fit_projects": [
      "React/Node.js web applications - has 3 months experience at Hillfort Technologies",
      "IoT sensor networks - Master's thesis on wireless sensor networks for bee colonies"
    ],
    "justification": "Strong full-stack foundation with ReactJS/Node.js from Hillfort Technologies internship. Master's research in IoT/wireless networks demonstrates ability to work on complex embedded systems. GitHub shows 17 repos with TypeScript/Python focus.",
    "key_strengths": [
      "Full-stack development: ReactJS, Node.js, TailwindCSS (proven in industry)",
      "Cloud infrastructure: AWS, GCP, Azure (from portfolio)",
      "IoT/Embedded systems: Master's thesis on WSN, ESP32, Arduino",
      "Research ability: Published paper on wireless sensor networks"
    ],
    "experience_highlights": [
      "3 months at Hillfort Technologies: ReactJS, Node.js, PostgreSQL, MongoDB",
      "Master's thesis: Wireless Sensor Network for bee colony monitoring",
      "ServiceNow Certified System Administrator",
      "17 GitHub repositories in TypeScript/Python"
    ],
    "areas_for_growth": [
      "Limited professional experience (6 months total)",
      "No visible open-source contributions",
      "Could expand testing/DevOps skills"
    ],
    "suggested_interview_focus": [
      "Deep dive on Hillfort Technologies project - architecture decisions, challenges",
      "Master's thesis implementation - technical details of WSN deployment",
      "System design capabilities for scaling web applications",
      "Experience with CI/CD and testing frameworks"
    ]
  }},
  
  "tier_prediction": "Tier 2 - Intermediate Expert",
  "timestamp": "2026-01-09T12:00:00"
}}

CRITICAL: Provide SPECIFIC evidence for every claim. Reference actual companies, projects, technologies, and numbers from the data.
"""

        try:
            print("[AIScorer] Calling LLM for complete analysis...")
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=3000  # Larger for comprehensive response
            )
            
            response_text = completion.choices[0].message.content
            result = self._clean_json_response(response_text)
            
            if not result:
                print("[AIScorer] ERROR: Failed to parse LLM response")
                return self._fallback_response()
            
            print(f"[AIScorer] SUCCESS: Complete analysis generated")
            print(f"[AIScorer] Overall Score: {result.get('scores', {}).get('overall_score', 0)}")
            print(f"[AIScorer] Decision: {result.get('admin_recommendation', {}).get('decision', 'UNKNOWN')}")
            
            return result
            
        except Exception as e:
            print(f"[AIScorer] Error: {e}")
            return self._fallback_response()
    
    def _fallback_response(self):
        """Fallback response when LLM fails"""
        return {
            "parsed_data": {
                "name": "Unknown",
                "email": "",
                "phone": "",
                "years_experience": 0,
                "all_skills": [],
                "certifications": [],
                "projects": [],
                "work_history": [],
                "research": {"paper_count": 0, "titles": [], "domains": []},
                "github_summary": {"repos": 0, "stars": 0, "top_languages": [], "notable_projects": []}
            },
            "scores": {
                "expertise_score": 50,
                "expertise_reasoning": "LLM analysis unavailable - fallback score",
                "performance_score": 50,
                "performance_reasoning": "LLM analysis unavailable - fallback score",
                "reliability_score": 50,
                "reliability_reasoning": "LLM analysis unavailable - fallback score",
                "quality_score": 50,
                "quality_reasoning": "LLM analysis unavailable - fallback score",
                "engagement_score": 50,
                "engagement_reasoning": "LLM analysis unavailable - fallback score",
                "overall_score": 50.0
            },
            "admin_recommendation": {
                "decision": "MANUAL REVIEW REQUIRED",
                "hiring_priority": "MEDIUM",
                "recommended_roles": ["Review required - LLM unavailable"],
                "best_fit_projects": ["Manual analysis needed"],
                "justification": "AI analysis failed - please review candidate data manually",
                "key_strengths": ["Data extracted successfully - LLM analysis pending"],
                "experience_highlights": ["Manual review required"],
                "areas_for_growth": ["Manual review required"],
                "suggested_interview_focus": ["Manual review required"]
            },
            "tier_prediction": "Unknown - Manual Review",
            "timestamp": datetime.now().isoformat(),
            "error": "LLM analysis failed"
        }
