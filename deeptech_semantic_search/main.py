"""
Semantic Search Microservice
FastAPI-based microservice for expert semantic search using sentence-transformers
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager

# Import our services (to be created)
import sys
import os
sys.path.append(os.path.dirname(__file__))

from services.embedding_service import EmbeddingService
from services.database_service import DatabaseService
from models.search_models import SearchRequest, SearchResponse, ExpertResult

# Load environment variables
load_dotenv()

# Initialize services (lazy initialization)
embedding_service = None
database_service = None

def get_embedding_service():
    global embedding_service
    if embedding_service is None:
        embedding_service = EmbeddingService()
    return embedding_service

def get_database_service():
    global database_service
    if database_service is None:
        database_service = DatabaseService()
    return database_service

# Initialize FastAPI app with lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting DeepTech Semantic Search API...")
    try:
        db_svc = get_database_service()
        await db_svc.initialize()
        print("✅ Database service initialized")
        
        embedding_svc = get_embedding_service()
        await embedding_svc.initialize()
        print("✅ Embedding service initialized")
    except Exception as e:
        print(f"❌ Failed to initialize services: {e}")
        raise
    
    yield
    
    # Shutdown
    print("🛑 Shutting down DeepTech Semantic Search API...")
    try:
        db_svc = get_database_service()
        await db_svc.close()
        print("✅ Database service closed")
    except Exception as e:
        print(f"❌ Error closing database service: {e}")

app = FastAPI(
    title="DeepTech Semantic Search API",
    description="AI-powered semantic search for expert recommendations",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint"""
    print("🔍 Root endpoint called")
    return {"message": "DeepTech Semantic Search API is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    """Detailed health check"""
    print("🔍 Health endpoint called")
    return {
        "status": "ok",
        "service": "DeepTech Semantic Search API",
        "database": "lazy_init",
        "embedding": "lazy_init",
        "timestamp": "2025-12-25"
    }

@app.post("/search", response_model=SearchResponse)
async def semantic_search(request: SearchRequest):
    """
    Perform semantic search for experts based on natural language query
    """
    try:
        # Initialize embedding service if not ready
        embedding_svc = get_embedding_service()

        # Generate embedding for the search query
        query_embedding = await embedding_svc.generate_embedding(request.query)

        # Search database for similar experts
        db_svc = get_database_service()
        experts_raw = await db_svc.search_similar_experts(
            query_embedding=query_embedding,
            limit=request.limit,
            threshold=request.threshold,
            filters=request.filters
        )

        # Transform database results to match ExpertResult model
        from models.search_models import ExpertResult, HourlyRates
        experts = []
        for expert in experts_raw:
            experts.append(ExpertResult(
                id=expert['id'],
                name=expert['name'],
                bio=expert['bio'],
                domains=expert['domains'] or [],
                skills=expert['skills'] or [],
                hourly_rates=HourlyRates(
                    advisory=expert['hourly_rate_advisory'],
                    architecture_review=expert['hourly_rate_architecture'],
                    hands_on_execution=expert['hourly_rate_execution']
                ),
                vetting_status=expert['vetting_status'],
                rating=expert['rating'],
                review_count=expert['review_count'],
                total_hours=expert['total_hours'],
                availability=expert['availability'],
                similarity_score=expert['similarity_score']
            ))

        return SearchResponse(
            query=request.query,
            results=experts,
            total_results=len(experts)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.post("/experts/{expert_id}/embedding")
async def update_expert_embedding(expert_id: str):
    """
    Regenerate and update embedding for a specific expert
    """
    try:
        # Fetch expert data from database
        db_svc = get_database_service()
        await db_svc.initialize()
        expert_data = await db_svc.get_expert_for_embedding(expert_id)
        if not expert_data:
            raise HTTPException(status_code=404, detail="Expert not found")

        # Generate new embedding
        embedding_svc = get_embedding_service()
        if not embedding_svc.is_ready():
            await embedding_svc.initialize()
        text_representation = embedding_svc.build_expert_text(expert_data)
        embedding = await embedding_svc.generate_embedding(text_representation)

        # Update in database
        await db_svc.update_expert_embedding(
            expert_id=expert_id,
            embedding=embedding,
            text=text_representation
        )

        return {"message": "Embedding updated successfully", "expert_id": expert_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

@app.post("/batch/embeddings")
async def generate_batch_embeddings():
    """
    Batch generate embeddings for all experts missing them
    """
    try:
        db_svc = get_database_service()
        await db_svc.initialize()
        embedding_svc = get_embedding_service()
        if not embedding_svc.is_ready():
            await embedding_svc.initialize()

        experts_to_process = await db_svc.get_experts_needing_embeddings()

        processed = 0
        updated = 0
        errors = 0

        for expert in experts_to_process:
            try:
                text_representation = embedding_svc.build_expert_text(expert)
                if not text_representation.strip():
                    continue  # Skip if no content

                embedding = await embedding_svc.generate_embedding(text_representation)
                await db_svc.update_expert_embedding(
                    expert_id=expert['id'],
                    embedding=embedding,
                    text=text_representation
                )

                updated += 1
                processed += 1

                # Progress logging (every 5 experts)
                if processed % 5 == 0:
                    print(f"Processed: {processed}/{len(experts_to_process)}")

            except Exception as e:
                print(f"Error processing expert {expert['id']}: {str(e)}")
                errors += 1
                processed += 1

        return {
            "message": "Batch embedding generation completed",
            "processed": processed,
            "updated": updated,
            "errors": errors
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch processing failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("Starting DeepTech Semantic Search API directly...")
    uvicorn.run(app, host="0.0.0.0", port=8000)