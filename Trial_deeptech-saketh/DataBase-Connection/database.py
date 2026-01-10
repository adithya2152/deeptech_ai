import os
import httpx
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("SUPABASE_CONNECTION_STRING")

if not DATABASE_URL:
    raise ValueError("Missing DATABASE_URL in .env")

class DatabaseService:
    """
    Handles data fetching using psycopg2 with strict schema alignment.
    """

    @staticmethod
    def _get_connection():
        """Helper to get a database connection."""
        try:
            conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
            return conn
        except Exception as e:
            print(f"Database connection error: {e}")
            return None

    @staticmethod
    def get_recent_experts(limit: int = 5) -> List[Dict[str, Any]]:
        conn = DatabaseService._get_connection()
        if not conn: return []

        try:
            with conn:
                with conn.cursor() as cur:
                    query = """
                        SELECT 
                            e.id, e.experience_summary, e.skills,
                            p.first_name, p.last_name, p.email
                        FROM experts e
                        JOIN profiles p ON e.id = p.id
                        LIMIT %s
                    """
                    cur.execute(query, (limit,))
                    rows = cur.fetchall()

                    experts = []
                    for row in rows:
                        data = dict(row)
                        f_name = data.pop('first_name', '') or ""
                        l_name = data.pop('last_name', '') or ""
                        data["name"] = f"{f_name} {l_name}".strip()
                        experts.append(data)
                    
                    return experts

        except Exception as e:
            print(f"Error fetching recent experts: {e}")
            return []
        finally:
            conn.close()

    @staticmethod
    def get_expert_profile(user_id: str) -> Optional[Dict[str, Any]]:
        conn = DatabaseService._get_connection()
        if not conn: return None
        try:
            with conn:
                with conn.cursor() as cur:
                    query = """
                        SELECT 
                            e.id, e.experience_summary, e.years_experience, e.domains, 
                            e.created_at, e.skills, e.expertise_areas, e.expert_status, 
                            e.total_hours, e.rating, e.review_count,
                            e.avg_daily_rate, e.avg_fixed_rate, e.avg_sprint_rate,
                            p.first_name, p.last_name, p.email, p.portfolio_url
                        FROM experts e
                        JOIN profiles p ON e.id = p.id
                        WHERE e.id = %s
                    """
                    cur.execute(query, (user_id,))
                    row = cur.fetchone()
                    if not row: return None

                    data = dict(row)
                    f_name = data.pop('first_name', '') or ""
                    l_name = data.pop('last_name', '') or ""
                    data["name"] = f"{f_name} {l_name}".strip()
                    data["skills"] = data.get("skills") or []
                    data["domains"] = data.get("domains") or []
                    return data
        except Exception as e:
            print(f"Error fetching expert profile: {e}")
            return None
        finally:
            conn.close()

    @staticmethod
    def get_quality_stats(user_id: str) -> Dict[str, float]:
        conn = DatabaseService._get_connection()
        if not conn: return {"avg_rating": 0.0, "review_count": 0, "positive_ratio": 0.0}
        try:
            with conn:
                with conn.cursor() as cur:
                    query = """
                        SELECT 
                            COUNT(*) as total_reviews,
                            COALESCE(AVG(rating), 0) as avg_rating,
                            COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_count
                        FROM feedback 
                        WHERE receiver_id = %s
                    """
                    cur.execute(query, (user_id,))
                    stats = cur.fetchone()
                    total = stats['total_reviews']
                    if total == 0: return {"avg_rating": 0.0, "review_count": 0, "positive_ratio": 0.0}
                    return {
                        "avg_rating": float(stats['avg_rating']),
                        "review_count": total,
                        "positive_ratio": stats['positive_count'] / total
                    }
        except Exception:
            return {"avg_rating": 0.0, "review_count": 0, "positive_ratio": 0.0}
        finally:
            conn.close()

    @staticmethod
    def get_contract_stats(user_id: str) -> Dict[str, float]:
        conn = DatabaseService._get_connection()
        if not conn: return {"contracts_completed": 0, "on_time_rate": 0.0}
        try:
            with conn:
                with conn.cursor() as cur:
                    query = """
                        SELECT 
                            COUNT(*) as total,
                            COUNT(CASE WHEN status::text = 'completed' THEN 1 END) as completed
                        FROM contracts
                        WHERE expert_id = %s
                    """
                    cur.execute(query, (user_id,))
                    stats = cur.fetchone()
                    return {"contracts_completed": stats['completed'], "on_time_rate": 0.0}
        except Exception:
            return {"contracts_completed": 0, "on_time_rate": 0.0}
        finally:
            conn.close()

    @staticmethod
    def get_scoring_metrics(expert_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetches ALL raw metrics in one query.
        FIX: Uses status::text casting to avoid Enum validation errors.
        """
        conn = DatabaseService._get_connection()
        if not conn: return None

        try:
            with conn:
                with conn.cursor() as cur:
                    sql = """
                    SELECT 
                        e.id, e.years_experience, e.expert_status, e.response_time_hours,
                        e.profile_updated_at, e.created_at,
                        COALESCE(array_length(e.skills, 1), 0) as skill_count,
                        
                        -- Expertise
                        (SELECT COUNT(*) FROM expert_documents ed WHERE ed.expert_id = e.id AND ed.document_type = 'credential') as cert_count,
                        (SELECT COUNT(*) FROM expert_documents ed WHERE ed.expert_id = e.id AND ed.document_type IN ('publication', 'other')) as paper_count,
                        
                        -- Performance (FIX: Cast status to text)
                        (SELECT COUNT(*) FROM contracts c WHERE c.expert_id = e.id) as total_contracts,
                        (SELECT COUNT(*) FROM contracts c WHERE c.expert_id = e.id AND c.status::text = 'completed') as completed_contracts,
                        (SELECT COUNT(*) FROM contracts c WHERE c.expert_id = e.id AND c.status::text = 'cancelled') as cancelled_contracts,
                        
                        -- On-Time (Projects linked to Contracts)
                        (SELECT COUNT(*) FROM contracts c JOIN projects p ON c.project_id = p.id 
                         WHERE c.expert_id = e.id AND p.completed_at <= p.deadline) as on_time_count,

                        -- Reliability
                        (SELECT COUNT(*) FROM disputes d JOIN contracts c ON d.contract_id = c.id WHERE c.expert_id = e.id) as dispute_count,

                        -- Quality
                        (SELECT COALESCE(AVG(rating), 0) FROM feedback f WHERE f.receiver_id = e.id) as avg_rating,
                        (SELECT COUNT(*) FROM feedback f WHERE f.receiver_id = e.id) as review_count,
                        (SELECT COUNT(*) FROM feedback f WHERE f.receiver_id = e.id AND f.is_positive = TRUE) as positive_feedback_count,

                        -- Engagement
                        (SELECT COUNT(*) FROM blogs b WHERE b.author_id = e.id) as blog_count,
                        (SELECT COUNT(*) FROM doubt_answers da WHERE da.user_id = e.id) as answer_count,
                        (SELECT COUNT(*) FROM answer_votes av JOIN doubt_answers da ON av.answer_id = da.id WHERE da.user_id = e.id AND av.vote_type = 'upvote') as upvote_count

                    FROM experts e
                    WHERE e.id = %s
                    """
                    cur.execute(sql, (expert_id,))
                    result = cur.fetchone()
                    return dict(result) if result else None
        except Exception as e:
            print(f"Error fetching scoring metrics: {e}")
            return None
        finally:
            conn.close()

    @staticmethod
    def update_expert_scores(user_id: str, scores: Dict[str, Any]):
        conn = DatabaseService._get_connection()
        if not conn: return

        try:
            with conn:
                with conn.cursor() as cur:
                    sql = """
                    INSERT INTO user_scores (
                        user_id, expertise_score, performance_score, reliability_score, 
                        quality_score, engagement_score, overall_score, last_calculated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (user_id) DO UPDATE SET
                        expertise_score = EXCLUDED.expertise_score,
                        performance_score = EXCLUDED.performance_score,
                        reliability_score = EXCLUDED.reliability_score,
                        quality_score = EXCLUDED.quality_score,
                        engagement_score = EXCLUDED.engagement_score,
                        overall_score = EXCLUDED.overall_score,
                        last_calculated_at = NOW();
                    """
                    cur.execute(sql, (
                        user_id,
                        scores['breakdown']['expertise'],
                        scores['breakdown']['performance'],
                        scores['breakdown']['reliability'],
                        scores['breakdown']['quality'],
                        scores['breakdown']['engagement'],
                        scores['overall']
                    ))
                    print(f"✅ Scores updated successfully for {user_id}")
        except Exception as e:
            print(f"Error updating scores: {e}")
        finally:
            conn.close()

    @staticmethod
    async def download_file_as_bytes(file_url: str) -> Optional[bytes]:
        if not file_url: return None
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(file_url)
                if resp.status_code == 200:
                    return resp.content
                return None
        except Exception:
            return None