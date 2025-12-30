"""
Database service for PostgreSQL with pgvector support
Handles expert data retrieval and embedding storage
"""

import asyncpg
import os
from typing import List, Dict, Any, Optional
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self):
        self.pool = None
        self.connection_string = os.getenv('SUPABASE_CONNECTION_STRING')
        if not self.connection_string:
            raise ValueError("SUPABASE_CONNECTION_STRING environment variable not set")

    async def initialize(self):
        """Initialize database connection pool"""
        if self.pool is not None:
            # Check if pool is still healthy
            try:
                async with self.pool.acquire() as conn:
                    await conn.fetchval("SELECT 1")
                logger.info("Database connection pool already initialized and healthy")
                return
            except Exception as e:
                logger.warning(f"Existing pool is unhealthy, recreating: {str(e)}")
                await self.close()
        
        try:
            logger.info("Initializing database connection pool")
            self.pool = await asyncpg.create_pool(
                self.connection_string,
                min_size=1,
                max_size=5,  # Reduced from 10 to 5
                command_timeout=30,  # Reduced from 60 to 30
                statement_cache_size=0
            )
            logger.info("Database connection pool initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            self.pool = None  # Ensure pool is None on failure
            raise  # Re-raise to let startup handle it

    def is_connected(self) -> bool:
        """Check if database connection is active"""
        return self.pool is not None

    async def close(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            self.pool = None
            logger.info("Database connection pool closed")

    @asynccontextmanager
    async def get_connection(self):
        """Get database connection from pool"""
        if not self.pool:
            raise RuntimeError("Database not initialized")

        conn = await self.pool.acquire()
        try:
            yield conn
        finally:
            await self.pool.release(conn)

    async def get_experts_needing_embeddings(self) -> List[Dict[str, Any]]:
        """
        Get experts that need embeddings generated or updated
        """
        query = """
        SELECT
            e.id,
            p.first_name || ' ' || p.last_name as name,
            e.experience_summary as bio,
            e.skills,
            e.domains,
            e.expertise_areas,
            e.patents,
            e.papers,
            e.products,
            e.embedding_updated_at,
            e.updated_at
        FROM experts e
        JOIN profiles p ON e.id = p.id
        WHERE e.embedding IS NULL
           OR e.embedding_updated_at IS NULL
           OR e.embedding_updated_at < e.updated_at
        ORDER BY e.created_at ASC
        """

        async with self.get_connection() as conn:
            rows = await conn.fetch(query)
            return [dict(row) for row in rows]

    async def get_expert_for_embedding(self, expert_id: str) -> Optional[Dict[str, Any]]:
        """
        Get expert data for embedding generation
        """
        query = """
        SELECT
            e.id,
            p.first_name || ' ' || p.last_name as name,
            e.experience_summary as bio,
            e.skills,
            e.domains,
            e.expertise_areas,
            e.patents,
            e.papers,
            e.products
        FROM experts e
        JOIN profiles p ON e.id = p.id
        WHERE e.id = $1
        """

        async with self.get_connection() as conn:
            row = await conn.fetchrow(query, expert_id)
            return dict(row) if row else None

    async def update_expert_embedding(self, expert_id: str, embedding: List[float], text: str):
        """
        Update expert's embedding in database
        """
        # Convert embedding list to PostgreSQL vector format
        vector_string = f"[{','.join(map(str, embedding))}]"

        query = """
        UPDATE experts
        SET
            embedding = $1::vector,
            embedding_text = $2,
            embedding_updated_at = NOW()
        WHERE id = $3
        """

        async with self.get_connection() as conn:
            await conn.execute(query, vector_string, text, expert_id)

    async def search_similar_experts(
        self,
        query_embedding: List[float],
        limit: int = 10,
        threshold: float = 0.7,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for experts similar to the query embedding
        """
        # Convert embedding to vector format
        vector_string = f"[{','.join(map(str, query_embedding))}]"

        # Base query with vector similarity
        query = """
        SELECT
            e.id::text as id,
            p.first_name || ' ' || p.last_name as name,
            e.experience_summary as bio,
            e.skills,
            e.domains,
            e.expertise_areas,
            e.hourly_rate_advisory,
            e.hourly_rate_architecture,
            e.hourly_rate_execution,
            e.vetting_status,
            e.rating,
            e.review_count,
            e.total_hours,
            CASE WHEN jsonb_typeof(e.availability) = 'array' AND jsonb_array_length(e.availability) > 0 THEN true ELSE false END as availability,
            1 - (e.embedding <=> $1::vector) as similarity_score
        FROM experts e
        JOIN profiles p ON e.id = p.id
        WHERE e.embedding IS NOT NULL
          AND p.role = 'expert'
          AND 1 - (e.embedding <=> $1::vector) >= $2
        """

        params = [vector_string, threshold]
        param_index = 3

        # Apply filters
        if filters:
            if filters.get('domain'):
                query += f" AND e.domains @> ${param_index}::text[]"
                params.append([filters['domain']])
                param_index += 1

            if filters.get('min_hourly_rate'):
                query += f" AND e.hourly_rate_advisory >= ${param_index}"
                params.append(filters['min_hourly_rate'])
                param_index += 1

            if filters.get('max_hourly_rate'):
                query += f" AND e.hourly_rate_advisory <= ${param_index}"
                params.append(filters['max_hourly_rate'])
                param_index += 1

            if filters.get('vetting_status'):
                query += f" AND e.vetting_status = ${param_index}"
                params.append(filters['vetting_status'])
                param_index += 1

            if filters.get('min_rating'):
                query += f" AND e.rating >= ${param_index}"
                params.append(filters['min_rating'])
                param_index += 1

            if filters.get('availability') is not None:
                query += f" AND e.availability = ${param_index}"
                params.append(filters['availability'])
                param_index += 1

        # Order by similarity and limit
        query += " ORDER BY similarity_score DESC LIMIT $" + str(param_index)
        params.append(limit)

        async with self.get_connection() as conn:
            rows = await conn.fetch(query, *params)
            return [dict(row) for row in rows]

    async def get_all_experts_with_embeddings(self) -> List[Dict[str, Any]]:
        """
        Get all experts that have embeddings (for maintenance/testing)
        """
        query = """
        SELECT
            e.id,
            p.first_name || ' ' || p.last_name as name,
            e.experience_summary as bio,
            e.embedding,
            e.embedding_updated_at
        FROM experts e
        JOIN profiles p ON e.id = p.id
        WHERE e.embedding IS NOT NULL
          AND p.role = 'expert'
        ORDER BY e.embedding_updated_at DESC
        """

        async with self.get_connection() as conn:
            rows = await conn.fetch(query)
            return [dict(row) for row in rows]