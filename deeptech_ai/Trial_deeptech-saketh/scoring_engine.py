# scoring_engine.py
import math

class DeepTechScorer:
    """
    Implements the exact scoring algorithms from the Architecture Document.
    Reference: Pages 4-6 of USER_SCORING_SYSTEM_ARCHITECTURE.pdf
    """

    def calculate_expertise_score(self, years_exp, skill_count, cert_count, paper_count, vetting_level="general"):
        # Logic Source: [cite: 116-122]
        s_exp = min((years_exp / 50) * 15, 15)
        s_skills = min(skill_count * 1.5, 10) # <-- Matcher helps maximize this!
        s_certs = min(cert_count * 5, 20)
        s_papers = min(paper_count * 2, 20)
        
        vetting_map = {"deep_tech_verified": 35, "advanced": 25, "general": 15}
        s_vetting = vetting_map.get(vetting_level, 15)

        return min(s_exp + s_skills + s_certs + s_papers + s_vetting, 100)

    def calculate_performance_score(self, completion_rate, on_time_rate, milestone_rate):
        # Logic Source: [cite: 132-133]
        s1 = (completion_rate * 100) * 0.40
        s2 = (on_time_rate * 100) * 0.35
        s3 = (milestone_rate * 100) * 0.25
        return min(s1 + s2 + s3, 100)

    def calculate_reliability_score(self, dispute_rate, cancel_rate, response_hours):
        # Logic Source: [cite: 145-148]
        s1 = max(100 - (dispute_rate * 100), 0) * 0.30
        s2 = max(100 - (cancel_rate * 100), 0) * 0.25
        
        if response_hours <= 2: time_score = 100
        elif response_hours <= 12: time_score = 80
        elif response_hours <= 24: time_score = 50
        else: time_score = 20
        s3 = time_score * 0.25
        
        # Adding default profile consistency (20 pts)
        return min(s1 + s2 + s3 + 20, 100)

    def calculate_quality_score(self, avg_rating, review_count, positive_ratio):
        # Logic Source: [cite: 158-161]
        s1 = (avg_rating / 5 * 100) * 0.50
        s2 = min((review_count / 50) * 100, 100) * 0.20
        s3 = (positive_ratio * 100) * 0.30
        return min(s1 + s2 + s3, 100)

    def calculate_engagement_score(self, answers_count, blog_post_count, upvotes):
        # Logic Source: [cite: 172-174]
        s1 = min((answers_count / 20) * 100, 40)
        s2 = min(blog_post_count * 5, 30)
        s3 = min((upvotes / 50) * 100, 30)
        return min(s1 + s2 + s3, 100)

    def calculate_overall_score(self, expertise, performance, reliability, quality, engagement):
        # Weighted Average [cite: 96-100]
        return round(
            expertise * 0.25 +
            performance * 0.30 +
            reliability * 0.25 +
            quality * 0.15 +
            engagement * 0.05, 2
        )

    def get_tier_and_badge(self, overall_score, contracts_count):
        # Source: Rank Tier Table (Page 6)
        if overall_score >= 98 and contracts_count >= 200: return "Tier 10: DeepTech Pioneer", "Legendary"
        if overall_score >= 93 and contracts_count >= 100: return "Tier 8: Industry Leader", "Master"
        if overall_score >= 86 and contracts_count >= 50: return "Tier 7: Master Practitioner", "Senior Expert"
        if overall_score >= 76 and contracts_count >= 25: return "Tier 6: Senior Expert", "Verified Specialist"
        if overall_score >= 66 and contracts_count >= 15: return "Tier 5: Verified Specialist", "Established"
        if overall_score >= 51 and contracts_count >= 18: return "Tier 4: Established Expert", "Competent"
        if overall_score >= 36 and contracts_count >= 13: return "Tier 3: Competent Expert", "Emerging"
        if overall_score >= 21 and contracts_count >= 1: return "Tier 2: Emerging Professional", "Newcomer"
        return "Tier 1: Newcomer", "Novice"