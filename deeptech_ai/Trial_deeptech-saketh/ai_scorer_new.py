from openai import OpenAI
import json
import re
from datetime import datetime

class AIScorer:
    """
    OpenRouter Scorer using the OpenAI Client structure.
    Requires an OpenRouter API Key (sk-or-...).
    """
    
    def __init__(self, api_key):
        if not api_key:
            raise ValueError("OpenRouter API Key is required")
        
        # OpenRouter Configuration
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
            # OpenRouter requires these headers for rankings/stats
            default_headers={
                "HTTP-Referer": "http://localhost:8501",
                "X-Title": "DeepTech Scorer"
            }
        )
        # Using Gemini Flash via OpenRouter for speed and context window
        # You can change this to "meta-llama/llama-3.2-3b-instruct:free" if you prefer
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
                try: return json.loads(match.group())
                except: pass
            return None
    
    def analyze_candidate(self, aggregated_data, job_description=""):
        print(f"[AIScorer] Starting OpenRouter analysis with {self.model}...")
        
        # Prepare data
        aggregated_json = json.dumps(aggregated_data, indent=2)
        job_block = f"JOB REQUIREMENTS:\n{job_description}\n" if job_description else ""
        
        # --- THE DETAILED PROMPT ---
        prompt = f"""
        You are an expert technical hiring manager. Analyze the provided candidate data and job description.
        
        CANDIDATE DATA:
        {aggregated_json}

        {job_block}

        YOUR TASK:
        1. Parse the candidate's Resume, GitHub, and Portfolio data.
        2. Score them (0-100) on 5 dimensions.
        3. Provide a hiring recommendation based ONLY on their actual data.

        CRITICAL OUTPUT RULES:
        - Do NOT copy data from examples. Use the actual candidate data.
        - If a field is missing, use "Not Provided" or 0.
        - Output MUST be valid JSON.

        REQUIRED JSON STRUCTURE (Fill with CANDIDATE'S REAL DATA):
        {{
          "parsed_data": {{
            "name": "<EXTRACT_NAME>",
            "email": "<EXTRACT_EMAIL>",
            "years_experience": <CALCULATE_YEARS_FLOAT>,
            "all_skills": ["<SKILL_1>", "<SKILL_2>", ...],
            "github_summary": {{ "repos": <COUNT>, "stars": <COUNT>, "top_languages": [...] }}
          }},
          "scores": {{
            "expertise_score": <0-100>,
            "performance_score": <0-100>,
            "reliability_score": <0-100>,
            "quality_score": <0-100>,
            "engagement_score": <0-100>,
            "overall_score": <0-100>
          }},
          "admin_recommendation": {{
            "decision": "RECOMMEND" or "CONSIDER" or "NO_HIRE",
            "hiring_priority": "HIGH" or "MEDIUM" or "LOW",
            "recommended_roles": ["<ROLE_BASED_ON_SKILLS>"],
            "justification": "<WRITE_2_SENTENCES_ABOUT_THEIR_ACTUAL_PROJECTS>",
            "key_strengths": ["<STRENGTH_1>", "<STRENGTH_2>"],
            "areas_for_growth": ["<WEAKNESS_1>"],
            "best_fit_projects": ["<PROJECT_1>", "<PROJECT_2>"]
          }},
          "tier_prediction": "Tier <1/2/3>",
          "timestamp": "{datetime.now().isoformat()}"
        }}
        """

        try:
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=2000
            )
            
            response_text = completion.choices[0].message.content
            result = self._clean_json_response(response_text)
            
            if not result:
                print("[AIScorer] Failed to parse JSON response")
                return self._fallback_response()
                
            print(f"[AIScorer] Success! Overall Score: {result.get('scores', {}).get('overall_score')}")
            return result
            
        except Exception as e:
            print(f"[AIScorer] OpenRouter API Error: {str(e)}")
            return self._fallback_response()

    def _fallback_response(self):
        return {
            "parsed_data": {"name": "Analysis Error", "email": "N/A"},
            "scores": {"overall_score": 0},
            "admin_recommendation": {"decision": "ERROR", "justification": "AI Service Failed - Check API Key"},
            "tier_prediction": "Error",
            "timestamp": datetime.now().isoformat()
        }