# matcher.py
import torch
from sentence_transformers import SentenceTransformer, util
import re

class SemanticMatcher:
    # A base list of skills to check against if the resume implies them
    DEFAULT_SKILL_DB = [
        'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'Go', 'Rust', 'SQL',
        'PyTorch', 'TensorFlow', 'Keras', 'Scikit-learn', 'NLP', 'Computer Vision',
        'React', 'Vue', 'Angular', 'FastAPI', 'Django', 'Flask', 'Node.js',
        'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Linux',
        'Redis', 'PostgreSQL', 'MongoDB', 'Elasticsearch', 'Kafka', 'Spark',
        'CI/CD', 'Git', 'Agile', 'System Design', 'Microservices'
    ]

    def __init__(self):
        # Auto-detect GPU or CPU
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"🧠 Semantic Engine loading on {self.device}...")
        
        self.model = SentenceTransformer('all-MiniLM-L6-v2', device=self.device)
        self.skill_embeddings = self.model.encode(self.DEFAULT_SKILL_DB, convert_to_tensor=True)

    def extract_skills_semantic(self, text, threshold=0.45):
        """
        Finds skills in text based on meaning, not just keywords.
        Example: "I built neural networks" -> Matches "Deep Learning"
        """
        if not text: return []
        
        # Split text into phrases for comparison
        candidates = re.split(r'[,|\n•]', text)
        candidates = [c.strip() for c in candidates if len(c.strip()) > 3 and len(c.strip()) < 50]
        
        if not candidates: return []

        candidate_embeddings = self.model.encode(candidates, convert_to_tensor=True)
        cosine_scores = util.pytorch_cos_sim(candidate_embeddings, self.skill_embeddings)
        
        found_skills = set()
        
        for i in range(len(candidates)):
            for j in range(len(self.DEFAULT_SKILL_DB)):
                # If similarity > threshold, we found a match
                if cosine_scores[i][j].item() > threshold:
                    found_skills.add(self.DEFAULT_SKILL_DB[j])
                    
        return list(found_skills)

    def match_job_description(self, resume_text, job_description):
        """
        Calculates a compatibility score between Resume and JD.
        """
        if not job_description or not resume_text: return 0.0

        emb_resume = self.model.encode(resume_text, convert_to_tensor=True)
        emb_job = self.model.encode(job_description, convert_to_tensor=True)

        score = util.pytorch_cos_sim(emb_resume, emb_job).item()
        
        # Normalize -0.2 to 0.8 range into 0-100 scale
        normalized = max(0, min(100, (score - 0.1) * 140))
        return round(normalized, 1)