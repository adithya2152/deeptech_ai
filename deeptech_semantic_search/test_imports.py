"""
Test script to verify semantic search microservice components
"""

import asyncio
import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_imports():
    """Test if all imports work"""
    try:
        print("Testing imports...")

        # Test FastAPI
        from fastapi import FastAPI
        print("✅ FastAPI import successful")

        # Test Pydantic
        from pydantic import BaseModel
        print("✅ Pydantic import successful")

        # Test sentence-transformers (this is the problematic one)
        print("Testing sentence-transformers...")
        from sentence_transformers import SentenceTransformer
        print("✅ sentence-transformers import successful")

        # Test database
        import psycopg2
        print("✅ psycopg2 import successful")

        # Test our services
        from services.embedding_service import EmbeddingService
        print("✅ EmbeddingService import successful")

        from services.database_service import DatabaseService
        print("✅ DatabaseService import successful")

        print("\n🎉 All imports successful!")

        # Test embedding service initialization
        print("\nTesting embedding service...")
        embedding_service = EmbeddingService()
        await embedding_service.initialize()
        print("✅ Embedding service initialized")

        # Test basic embedding
        test_text = "This is a test for semantic search"
        embedding = await embedding_service.generate_embedding(test_text)
        print(f"✅ Generated embedding with {len(embedding)} dimensions")

        return True

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_imports())
    if success:
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Tests failed!")
        sys.exit(1)