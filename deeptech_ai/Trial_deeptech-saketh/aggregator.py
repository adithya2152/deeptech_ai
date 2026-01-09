# aggregator.py
import numpy as np
from typing import List, Dict, Any
from collections import Counter

class DocumentAggregator:
    """
    Aggregates data from multiple documents (resumes, portfolios, GitHub, research)
    into a unified candidate profile for scoring.
    """
    
    def __init__(self):
        pass
    
    def merge_skills(self, documents: List[Dict]) -> List[str]:
        """
        Combine skills from all documents with deduplication and frequency weighting.
        Returns: Unique list of skills sorted by frequency
        """
        all_skills = []
        for doc in documents:
            skills = doc.get('skills', [])
            all_skills.extend(skills)
        
        # Count frequency and deduplicate (case-insensitive)
        skill_counts = Counter([skill.lower() for skill in all_skills])
        
        # Return unique skills sorted by frequency (most common first)
        return [skill for skill, _ in skill_counts.most_common()]
    
    def merge_experience(self, documents: List[Dict]) -> float:
        """
        Take maximum years of experience across all documents.
        Rationale: Most recent/complete resume likely has accurate number.
        """
        years_list = [doc.get('years_experience', 0) for doc in documents]
        return max(years_list) if years_list else 0
    
    def merge_certifications(self, documents: List[Dict]) -> int:
        """
        Sum unique certifications across documents.
        """
        all_certs = set()
        for doc in documents:
            certs = doc.get('certifications', [])
            all_certs.update([cert.lower() for cert in certs])
        return len(all_certs)
    
    def merge_research(self, documents: List[Dict]) -> Dict[str, Any]:
        """
        Aggregate research publications across documents.
        """
        total_papers = sum(doc.get('paper_count', 0) for doc in documents)
        total_patents = sum(doc.get('patent_count', 0) for doc in documents)
        
        # Collect all research titles
        all_titles = []
        for doc in documents:
            titles = doc.get('research_titles', [])
            all_titles.extend(titles)
        
        # Get most comprehensive summary
        summaries = [doc.get('research_summary', '') for doc in documents if doc.get('research_summary')]
        best_summary = max(summaries, key=len) if summaries else ""
        
        return {
            'paper_count': total_papers,
            'patent_count': total_patents,
            'research_titles': list(set(all_titles)),  # Deduplicate
            'research_summary': best_summary
        }
    
    def merge_engagement(self, documents: List[Dict]) -> Dict[str, Any]:
        """
        Aggregate community engagement metrics.
        """
        return {
            'blog_post_count': sum(doc.get('blog_post_count', 0) for doc in documents),
            'community_answers': sum(doc.get('community_answers', 0) for doc in documents),
            'upvotes': sum(doc.get('upvotes', 0) for doc in documents),
            'github_repos': sum(doc.get('github_repos', 0) for doc in documents),
            'github_stars': sum(doc.get('github_stars', 0) for doc in documents),
            'github_commits': sum(doc.get('github_commits', 0) for doc in documents),
            'top_topics': self._merge_topics(documents)
        }
    
    def _merge_topics(self, documents: List[Dict]) -> List[str]:
        """
        Combine top topics from all sources.
        """
        all_topics = []
        for doc in documents:
            topics = doc.get('top_topics', [])
            all_topics.extend(topics)
            
            # Also include GitHub languages as topics
            languages = doc.get('github_languages', [])
            all_topics.extend(languages)
        
        # Count and return top 10
        topic_counts = Counter(all_topics)
        return [topic for topic, _ in topic_counts.most_common(10)]
    
    def calculate_semantic_centroid(self, embeddings: List[np.ndarray]) -> np.ndarray:
        """
        Average sentence transformer embeddings from all documents.
        Returns centroid embedding representing the unified profile.
        """
        if not embeddings:
            return np.zeros(384)  # Default for all-MiniLM-L6-v2
        
        # Stack and average
        embeddings_array = np.vstack(embeddings)
        centroid = np.mean(embeddings_array, axis=0)
        
        # Normalize (unit vector)
        norm = np.linalg.norm(centroid)
        return centroid / norm if norm > 0 else centroid
    
    def calculate_document_coverage_score(self, documents: List[Dict]) -> float:
        """
        Bonus score for having multiple data sources.
        0-20 points based on diversity of sources.
        """
        source_types = set()
        
        for doc in documents:
            doc_type = doc.get('source_type', 'unknown')
            source_types.add(doc_type)
        
        # Scoring:
        # 1 source: 0 points
        # 2 sources: 5 points
        # 3 sources: 12 points
        # 4+ sources: 20 points
        source_count = len(source_types)
        
        if source_count >= 4:
            return 20.0
        elif source_count == 3:
            return 12.0
        elif source_count == 2:
            return 5.0
        else:
            return 0.0
    
    def aggregate_profile(self, documents: List[Dict]) -> Dict[str, Any]:
        """
        Main aggregation method - combines all documents into unified profile.
        """
        if not documents:
            return self._empty_profile()
        
        # Get most common name
        names = [doc.get('name', 'Unknown') for doc in documents if doc.get('name') != 'Unknown']
        name = max(set(names), key=names.count) if names else 'Unknown'
        
        # Merge all components
        skills = self.merge_skills(documents)
        research_data = self.merge_research(documents)
        engagement_data = self.merge_engagement(documents)
        
        # Combine full_text from all documents
        full_texts = [doc.get('full_text', '') for doc in documents if doc.get('full_text')]
        combined_text = '\n\n---DOCUMENT SEPARATOR---\n\n'.join(full_texts)
        
        return {
            "name": name,
            "full_text": combined_text,
            "years_experience": self.merge_experience(documents),
            "skills": skills,
            "skill_count": len(skills),
            "certification_count": self.merge_certifications(documents),
            
            # Research
            "paper_count": research_data['paper_count'],
            "patent_count": research_data['patent_count'],
            "research_titles": research_data['research_titles'],
            "research_summary": research_data['research_summary'],
            
            # Engagement
            "blog_post_count": engagement_data['blog_post_count'],
            "community_answers": engagement_data['community_answers'],
            "upvotes": engagement_data['upvotes'],
            "github_repos": engagement_data['github_repos'],
            "github_stars": engagement_data['github_stars'],
            "github_commits": engagement_data['github_commits'],
            "top_topics": engagement_data['top_topics'],
            
            # Metadata
            "document_count": len(documents),
            "source_types": list(set(doc.get('source_type', 'unknown') for doc in documents))
        }
    
    def _empty_profile(self) -> Dict[str, Any]:
        """Return empty profile structure."""
        return {
            "name": "Unknown",
            "full_text": "",
            "years_experience": 0,
            "skills": [],
            "skill_count": 0,
            "certification_count": 0,
            "paper_count": 0,
            "patent_count": 0,
            "research_titles": [],
            "research_summary": "",
            "blog_post_count": 0,
            "community_answers": 0,
            "upvotes": 0,
            "github_repos": 0,
            "github_stars": 0,
            "github_commits": 0,
            "top_topics": [],
            "document_count": 0,
            "source_types": []
        }
