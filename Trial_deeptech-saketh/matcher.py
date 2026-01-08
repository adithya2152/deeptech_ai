# matcher.py
import torch
from sentence_transformers import SentenceTransformer, util
import re

class SemanticMatcher:
    # Comprehensive skill database
    SKILL_DATABASE = [
        # Programming Languages
        'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 
        'Scala', 'Kotlin', 'Swift', 'R', 'MATLAB', 'Julia', 'PHP', 'Ruby',
        
        # ML/AI Frameworks
        'PyTorch', 'TensorFlow', 'Keras', 'scikit-learn', 'JAX', 'MXNet', 
        'Caffe', 'XGBoost', 'LightGBM', 'CatBoost', 'Hugging Face Transformers',
        
        # Web Frameworks
        'React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt', 'Django', 
        'Flask', 'FastAPI', 'Express.js', 'Spring Boot', 'ASP.NET',
        
        # Cloud Platforms
        'AWS', 'Amazon Web Services', 'Azure', 'Google Cloud Platform', 'GCP', 
        'Heroku', 'DigitalOcean', 'Vercel', 'Netlify', 'Cloudflare',
        
        # Databases
        'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 
        'Cassandra', 'DynamoDB', 'Neo4j', 'SQLite', 'Oracle Database',
        
        # DevOps/Tools
        'Docker', 'Kubernetes', 'Jenkins', 'Git', 'GitHub Actions', 'GitLab CI',
        'Terraform', 'Ansible', 'Grafana', 'Prometheus', 'Kafka', 'Airflow', 'Spark',
        
        # AI/ML Concepts
        'Deep Learning', 'Machine Learning', 'Natural Language Processing', 
        'Computer Vision', 'Reinforcement Learning', 'Neural Networks',
        'Convolutional Neural Networks', 'Transformers', 'BERT', 'GPT',
        
        # Specialized
        'Robotics', 'Quantum Computing', 'Blockchain', 'Embedded Systems',
        'Real-time Systems', 'Distributed Systems', 'Microservices'
    ]

    def __init__(self):
        # Auto-detect GPU or CPU
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"🧠 Semantic Engine loading on {self.device}...")
        
        self.model = SentenceTransformer('all-MiniLM-L6-v2', device=self.device)
        self.skill_embeddings = self.model.encode(self.SKILL_DATABASE, convert_to_tensor=True)

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
            for j in range(len(self.SKILL_DATABASE)):
                # If similarity > threshold, we found a match
                if cosine_scores[i][j].item() > threshold:
                    found_skills.add(self.SKILL_DATABASE[j])
                    
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