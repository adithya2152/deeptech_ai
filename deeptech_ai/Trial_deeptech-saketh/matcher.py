# matcher.py
import torch
from sentence_transformers import SentenceTransformer, util
import re
import numpy as np

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
    
    def encode_document(self, text):
        """
        Encode a document into a sentence embedding.
        Returns numpy array (384-dim for all-MiniLM-L6-v2)
        """
        if not text or len(text.strip()) < 10:
            return np.zeros(384)
        
        embedding = self.model.encode(text, convert_to_tensor=False)
        return np.array(embedding)
    
    def score_document_quality(self, document_text):
        """
        Evaluate document completeness and depth (0-100).
        Based on length, structure, and information density.
        """
        if not document_text:
            return 0
        
        score = 0
        
        # Length score (0-30 points)
        char_count = len(document_text)
        if char_count > 5000:
            score += 30
        elif char_count > 2000:
            score += 20
        elif char_count > 500:
            score += 10
        
        # Structure indicators (0-40 points)
        structure_keywords = [
            'experience', 'education', 'skills', 'projects', 'work',
            'responsibilities', 'achievements', 'certifications', 'publications'
        ]
        found_sections = sum(1 for kw in structure_keywords if kw in document_text.lower())
        score += min(found_sections * 5, 40)
        
        # Information density (0-30 points)
        # Check for technical terms, numbers, dates
        has_dates = bool(re.search(r'\b(19|20)\d{2}\b', document_text))
        has_numbers = bool(re.search(r'\d+', document_text))
        has_technical = bool(re.search(r'(api|algorithm|database|framework|ml|ai|cloud)', document_text.lower()))
        
        if has_dates: score += 10
        if has_numbers: score += 10
        if has_technical: score += 10
        
        return min(score, 100)
    
    def calculate_profile_coherence(self, doc_embeddings):
        """
        Measure consistency across multiple documents (0-100).
        Higher score = documents tell a consistent story.
        """
        if not doc_embeddings or len(doc_embeddings) < 2:
            return 100  # Single document is perfectly coherent
        
        # Calculate pairwise cosine similarities
        embeddings_tensor = torch.tensor(np.vstack(doc_embeddings))
        similarity_matrix = util.pytorch_cos_sim(embeddings_tensor, embeddings_tensor)
        
        # Get upper triangle (exclude diagonal)
        n = len(doc_embeddings)
        similarities = []
        for i in range(n):
            for j in range(i+1, n):
                similarities.append(similarity_matrix[i][j].item())
        
        # Average similarity
        avg_similarity = np.mean(similarities) if similarities else 1.0
        
        # Convert to 0-100 scale (0.5-1.0 similarity -> 0-100 score)
        coherence = max(0, min(100, (avg_similarity - 0.3) * 140))
        
        return round(coherence, 1)
    
    def semantic_overall_score(self, aggregated_embedding, jd_embedding, doc_quality_scores, coherence_score):
        """
        Final sentence-transformer based scoring combining:
        - Content match to JD (60%)
        - Document quality (20%)
        - Cross-document coherence (20%)
        """
        # Job match score
        if isinstance(aggregated_embedding, np.ndarray) and isinstance(jd_embedding, np.ndarray):
            agg_tensor = torch.tensor(aggregated_embedding).unsqueeze(0)
            jd_tensor = torch.tensor(jd_embedding).unsqueeze(0)
            match_similarity = util.pytorch_cos_sim(agg_tensor, jd_tensor).item()
            match_score = max(0, min(100, (match_similarity - 0.1) * 140))
        else:
            match_score = 0
        
        # Average document quality
        avg_quality = np.mean(doc_quality_scores) if doc_quality_scores else 0
        
        # Weighted combination
        final_score = (
            match_score * 0.60 +
            avg_quality * 0.20 +
            coherence_score * 0.20
        )
        
        return round(final_score, 2)