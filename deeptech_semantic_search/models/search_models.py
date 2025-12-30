"""
Pydantic models for semantic search API
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum

class VettingStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class SearchFilters(BaseModel):
    """Filters for expert search"""
    domain: Optional[str] = None
    min_hourly_rate: Optional[float] = None
    max_hourly_rate: Optional[float] = None
    vetting_status: Optional[VettingStatus] = None
    min_rating: Optional[float] = None
    availability: Optional[bool] = None

class SearchRequest(BaseModel):
    """Request model for semantic search"""
    query: str
    limit: int = 10
    threshold: float = 0.37  # Cosine similarity threshold - increased for more precise results
    filters: Optional[SearchFilters] = None

class HourlyRates(BaseModel):
    """Expert hourly rates"""
    advisory: Optional[float] = None
    architecture_review: Optional[float] = None
    hands_on_execution: Optional[float] = None

class ExpertResult(BaseModel):
    """Expert result from semantic search"""
    id: str
    name: str
    bio: str
    domains: List[str]
    skills: List[str]
    hourly_rates: HourlyRates
    vetting_status: VettingStatus
    rating: Optional[float] = None
    review_count: Optional[int] = None
    total_hours: Optional[int] = None
    availability: Optional[bool] = None
    similarity_score: float

class SearchResponse(BaseModel):
    """Response model for semantic search"""
    query: str
    results: List[ExpertResult]
    total_results: int
    execution_time_ms: Optional[float] = None