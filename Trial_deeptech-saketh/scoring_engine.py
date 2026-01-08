import math

class DeepTechScorer:
    """
    Implements the exact scoring algorithms from the Architecture Document.
    Reference: Pages 4-6 of USER_SCORING_SYSTEM_ARCHITECTURE.pdf
    """

    def calculate_expertise_score(self, years_exp, skill_count, cert_count, paper_count, patent_count=0, product_count=0, vetting_level="general"):
        """
        Calculates Expertise Score (0-100).
        """
        # 1. Experience: Max 15 points (years / 50 * 15)
        s_exp = min((years_exp / 50) * 15, 15)
        
        # 2. Skills: Max 10 points (count * 1.5)
        s_skills = min(skill_count * 1.5, 10)
        
        # 3. Certifications: Max 20 points (count * 5)
        s_certs = min(cert_count * 5, 20)
        
        # 4. Research/Output: Max 20 points ((papers + patents + products) * 2)
        research_total = paper_count + patent_count + product_count
        s_research = min(research_total * 2, 20)
        
        # 5. Vetting Level: Max 35 points
        vetting_map = {"deep_tech_verified": 35, "advanced": 25, "general": 15}
        s_vetting = vetting_map.get(vetting_level, 15)

        return min(s_exp + s_skills + s_certs + s_research + s_vetting, 100)

    def calculate_performance_score(self, completion_rate, on_time_rate, milestone_rate):
        """
        Calculates Performance Score (0-100).
        """
        # Completion Rate (40%)
        s1 = (completion_rate * 100) * 0.40
        # On-Time Delivery (35%)
        s2 = (on_time_rate * 100) * 0.35
        # Milestone Achievement (25%)
        s3 = (milestone_rate * 100) * 0.25
        
        return min(s1 + s2 + s3, 100)

    def calculate_reliability_score(self, dispute_rate, cancel_rate, response_hours, profile_consistency=100):
        """
        Calculates Reliability Score (0-100).
        """
        # 1. Dispute Rate (30%) - Inverse (Lower is better)
        s1 = max(100 - (dispute_rate * 100), 0) * 0.30
        
        # 2. Cancellation Rate (25%) - Inverse
        s2 = max(100 - (cancel_rate * 100), 0) * 0.25
        
        # 3. Response Time (25%)
        if response_hours <= 2: time_score = 100
        elif response_hours <= 12: time_score = 80
        elif response_hours <= 24: time_score = 50
        else: time_score = 20
        s3 = time_score * 0.25
        
        # 4. Profile Consistency (20%)
        s4 = profile_consistency * 0.20
        
        return min(s1 + s2 + s3 + s4, 100)

    def calculate_quality_score(self, avg_rating, review_count, positive_ratio):
        """
        Calculates Quality Score (0-100).
        """
        # 1. Average Rating (50%)
        s1 = (avg_rating / 5 * 100) * 0.50
        
        # 2. Review Volume (20%) - Caps at 50 reviews
        s2 = min((review_count / 50) * 100, 100) * 0.20
        
        # 3. Positive Feedback Ratio (30%)
        s3 = (positive_ratio * 100) * 0.30
        
        return min(s1 + s2 + s3, 100)

    def calculate_engagement_score(self, answers_count, blog_post_count, upvotes):
        """
        Calculates Engagement Score (0-100).
        """
        # 1. Community Answers (40%) - Caps at 20 answers
        s1 = min((answers_count / 20) * 100, 40)
        
        # 2. Content Creation (30%) - Caps at 6 posts (6 * 5 = 30)
        s2 = min(blog_post_count * 5, 30)
        
        # 3. Peer Recognition (30%) - Caps at 50 upvotes
        s3 = min((upvotes / 50) * 100, 30)
        
        return min(s1 + s2 + s3, 100)

    def calculate_overall_score(self, expertise, performance, reliability, quality, engagement):
        """
        Calculates the final Weighted Average Score.
        """
        return round(
            expertise * 0.25 +
            performance * 0.30 +
            reliability * 0.25 +
            quality * 0.15 +
            engagement * 0.05, 2
        )

    def get_tier_and_badge(self, overall_score, contracts_count):
        """
        Determines Rank Tier based on Score and Contract Volume.
        """
        if overall_score >= 98 and contracts_count >= 200: return "Tier 10: DeepTech Pioneer", "Legendary"
        if overall_score >= 93 and contracts_count >= 100: return "Tier 8: Industry Leader", "Master"
        if overall_score >= 86 and contracts_count >= 50: return "Tier 7: Master Practitioner", "Senior Expert"
        if overall_score >= 76 and contracts_count >= 25: return "Tier 6: Senior Expert", "Verified Specialist"
        if overall_score >= 66 and contracts_count >= 15: return "Tier 5: Verified Specialist", "Established"
        if overall_score >= 51 and contracts_count >= 18: return "Tier 4: Established Expert", "Competent"
        if overall_score >= 36 and contracts_count >= 13: return "Tier 3: Competent Expert", "Emerging"
        if overall_score >= 21 and contracts_count >= 1: return "Tier 2: Emerging Professional", "Newcomer"
        return "Tier 1: Newcomer", "Novice"