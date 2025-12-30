"""
Embedding service using sentence-transformers
Handles AI model loading and embedding generation
"""

import numpy as np
from typing import List, Dict, Any
import asyncio
import logging

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        self.model = None
        self.model_name = "all-MiniLM-L6-v2"  # 384-dimensional embeddings
        self.is_initialized = False

    async def initialize(self):
        """Load the sentence transformer model"""
        try:
            print(f"🔄 Loading sentence transformer model: {self.model_name}")
            # Import here to avoid module-level import issues
            from sentence_transformers import SentenceTransformer

            print("🔄 Creating SentenceTransformer instance...")
            # Run model loading in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            self.model = await loop.run_in_executor(None, SentenceTransformer, self.model_name)
            self.is_initialized = True
            print("✅ Model loaded successfully")
        except Exception as e:
            print(f"❌ Failed to load model: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

    def is_ready(self) -> bool:
        """Check if the service is ready"""
        return self.is_initialized and self.model is not None

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for input text
        Returns 384-dimensional vector as list of floats
        """
        if not self.is_ready():
            raise RuntimeError("Embedding service not initialized")

        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        try:
            # Run embedding generation in thread pool
            loop = asyncio.get_event_loop()
            embedding = await loop.run_in_executor(
                None,
                lambda: self.model.encode(text, convert_to_numpy=True)
            )

            # Convert numpy array to list
            return embedding.tolist()

        except Exception as e:
            logger.error(f"Failed to generate embedding: {str(e)}")
            raise

    def build_expert_text(self, expert_data: Dict[str, Any]) -> str:
        """
        Build comprehensive text representation of an expert for embedding
        """
        parts = []

        # Basic info
        if expert_data.get('name'):
            parts.append(f"Name: {expert_data['name']}")

        # Bio/Experience
        if expert_data.get('bio') or expert_data.get('experience_summary'):
            bio = expert_data.get('bio') or expert_data.get('experience_summary', '')
            parts.append(f"Experience: {bio}")

        # Skills
        if expert_data.get('skills'):
            skills = expert_data['skills']
            if isinstance(skills, list):
                skills_text = ", ".join(skills)
            else:
                skills_text = str(skills)
            parts.append(f"Skills: {skills_text}")

        # Domains/Expertise areas
        if expert_data.get('domains'):
            domains = expert_data['domains']
            if isinstance(domains, list):
                domains_text = ", ".join(domains)
            else:
                domains_text = str(domains)
            parts.append(f"Domains: {domains_text}")

        if expert_data.get('expertise_areas'):
            expertise = expert_data['expertise_areas']
            if isinstance(expertise, list):
                expertise_text = ", ".join(expertise)
            else:
                expertise_text = str(expertise)
            parts.append(f"Expertise Areas: {expertise_text}")

        # Patents, papers, products
        if expert_data.get('patents'):
            parts.append(f"Patents: {expert_data['patents']}")

        if expert_data.get('papers'):
            parts.append(f"Publications: {expert_data['papers']}")

        if expert_data.get('products'):
            parts.append(f"Products: {expert_data['products']}")

        # Combine all parts
        return " | ".join(parts)

    async def calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Calculate cosine similarity between two embeddings
        """
        try:
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)

            # Cosine similarity
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)

            if norm1 == 0 or norm2 == 0:
                return 0.0

            similarity = dot_product / (norm1 * norm2)
            return float(similarity)

        except Exception as e:
            logger.error(f"Failed to calculate similarity: {str(e)}")
            return 0.0