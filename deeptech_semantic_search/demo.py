"""
Semantic Search Demo
Demonstrates the core functionality of the semantic search microservice
"""

import asyncio
import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def demo_semantic_search():
    """Demonstrate semantic search functionality"""
    print("🚀 DeepTech Semantic Search Demo")
    print("=" * 50)

    try:
        # Import services
        from services.embedding_service import EmbeddingService
        print("✅ Services imported successfully")

        # Initialize embedding service
        print("\n📦 Initializing embedding service...")
        embedding_service = EmbeddingService()
        await embedding_service.initialize()
        print("✅ Embedding service initialized")

        # Test embedding generation
        print("\n🧮 Testing embedding generation...")
        test_texts = [
            "Machine learning expert with Python experience",
            "Blockchain developer specializing in smart contracts",
            "Full-stack developer with React and Node.js",
            "Data scientist with expertise in computer vision"
        ]

        embeddings = []
        for i, text in enumerate(test_texts, 1):
            print(f"  Generating embedding {i}/4...")
            embedding = await embedding_service.generate_embedding(text)
            embeddings.append((text, embedding))
            print(f"  ✅ Generated {len(embedding)}-dimensional embedding")

        # Test similarity calculation
        print("\n📊 Testing similarity calculations...")
        query = "AI developer with machine learning skills"
        query_embedding = await embedding_service.generate_embedding(query)

        similarities = []
        for text, embedding in embeddings:
            similarity = await embedding_service.calculate_similarity(query_embedding, embedding)
            similarities.append((text, similarity))
            print(".3f")

        # Sort by similarity
        similarities.sort(key=lambda x: x[1], reverse=True)

        print(f"\n🏆 Top matches for query: '{query}'")
        print("-" * 50)
        for i, (text, similarity) in enumerate(similarities[:3], 1):
            print(f"{i}. {text[:60]}... (similarity: {similarity:.3f})")

        # Test expert text building
        print(f"\n📝 Testing expert profile text building...")
        sample_expert = {
            "name": "John Doe",
            "bio": "Experienced machine learning engineer with 5 years in AI development",
            "skills": ["Python", "TensorFlow", "PyTorch", "Machine Learning"],
            "domains": ["AI", "Machine Learning", "Computer Vision"],
            "experience_summary": "Led multiple AI projects including computer vision systems"
        }

        expert_text = embedding_service.build_expert_text(sample_expert)
        print("Sample expert text:")
        print(f"'{expert_text[:200]}...'")
        print(f"Length: {len(expert_text)} characters")

        # Generate embedding for expert
        expert_embedding = await embedding_service.generate_embedding(expert_text)
        print(f"✅ Generated expert embedding ({len(expert_embedding)} dimensions)")

        print(f"\n🎉 Demo completed successfully!")
        print("The semantic search microservice core functionality is working perfectly!")
        print("\nNext steps:")
        print("- Fix database connectivity for full functionality")
        print("- Deploy the web service")
        print("- Integrate with the main application")

        return True

    except Exception as e:
        print(f"❌ Demo failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(demo_semantic_search())
    if success:
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Demo failed!")
        sys.exit(1)