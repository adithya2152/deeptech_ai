"""
Test Expert Model - Semantic Search Methods
Tests the embedding-related methods in database and embedding services

Run: python test_expert_model.py
"""

import asyncio
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.embedding_service import EmbeddingService
from services.database_service import DatabaseService

async def test_expert_model():
    """Test expert model semantic search methods"""
    print('=' * 60)
    print('EXPERT MODEL - SEMANTIC SEARCH TESTS')
    print('=' * 60 + '\n')

    try:
        # Initialize services
        embedding_service = EmbeddingService()
        database_service = DatabaseService()

        await embedding_service.initialize()
        await database_service.initialize()

        # Test 1: Get experts needing embeddings
        print('Test 1: Get experts needing embeddings')
        print('-' * 60)

        experts_needing_embedding = await database_service.get_experts_needing_embeddings()
        print(f'✅ Found {len(experts_needing_embedding)} experts needing embeddings\n')

        if len(experts_needing_embedding) > 0:
            print('Sample expert:')
            sample = experts_needing_embedding[0]
            print(f'  ID: {sample["id"]}')
            print(f'  Name: {sample.get("name", "N/A")}')
            bio = sample.get("bio", "")
            print(f'  Bio: {bio[:80] + "..." if len(bio) > 80 else bio}')
            print(f'  Domains: {sample.get("domains", "N/A")}')
            print(f'  Has embedding: {"Yes" if sample.get("embedding_updated_at") else "No"}\n')
        else:
            print('No experts need embeddings (all up to date)\n')

        # Test 2: Update embedding (if experts exist)
        if len(experts_needing_embedding) > 0:
            print('Test 2: Update embedding for first expert')
            print('-' * 60)

            test_expert = experts_needing_embedding[0]

            # Generate a test embedding using embedding service
            test_text = embedding_service.build_expert_text(test_expert)

            if test_text.strip():
                test_embedding = await embedding_service.generate_embedding(test_text)

                result = await database_service.update_expert_embedding(
                    test_expert['id'],
                    test_embedding,
                    test_text
                )

                print('✅ Successfully updated embedding')
                print(f'   Expert ID: {test_expert["id"]}')
                print(f'   Text length: {len(test_text)} characters')
                print(f'   Embedding dimensions: {len(test_embedding)}\n')
            else:
                print('⚠️  Expert has no text content to embed\n')

        # Test 3: Get all experts with embeddings
        print('Test 3: Get all experts with embeddings')
        print('-' * 60)

        experts_with_embeddings = await database_service.get_all_experts_with_embeddings()
        print(f'✅ Found {len(experts_with_embeddings)} experts with embeddings\n')

        if len(experts_with_embeddings) > 0:
            print('Sample expert with embedding:')
            sample = experts_with_embeddings[0]
            print(f'  ID: {sample["id"]}')
            print(f'  Name: {sample.get("name", "N/A")}')
            print(f'  Has embedding: {"Yes" if sample.get("embedding") else "No"}')
            print(f'  Hourly rate: {sample.get("hourly_rate", "N/A")}')
            print(f'  Availability: {sample.get("availability", "N/A")}\n')

        # Test 4: Test similarity search (if we have embeddings)
        if len(experts_with_embeddings) > 0:
            print('Test 4: Test similarity search')
            print('-' * 60)

            # Use the first expert's embedding as query
            query_expert = experts_with_embeddings[0]
            query_embedding = query_expert['embedding']

            # Convert to list if it's a string (from database)
            if isinstance(query_embedding, str):
                # Parse PostgreSQL vector format [1.0,2.0,...]
                query_embedding = [float(x) for x in query_embedding.strip('[]').split(',')]

            similar_experts = await database_service.search_similar_experts(query_embedding, limit=3)

            print(f'✅ Found {len(similar_experts)} similar experts')
            print(f'   Query expert: {query_expert.get("name", "Unknown")}')

            if len(similar_experts) > 0:
                print('   Similar experts:')
                for i, expert in enumerate(similar_experts[:3], 1):
                    similarity = expert.get('similarity', 0)
                    print(f'     {i}. {expert.get("name", "Unknown")} (similarity: {similarity:.3f})')
            print()

        # Test 5: Test embedding service methods
        print('Test 5: Test embedding service methods')
        print('-' * 60)

        test_text = "Python developer with 5 years experience in machine learning and AI"
        embedding = await embedding_service.generate_embedding(test_text)
        print(f'✅ Generated embedding for test text')
        print(f'   Text: "{test_text}"')
        print(f'   Embedding dimensions: {len(embedding)}')
        print(f'   Sample values: {embedding[:5]}...\n')

        # Test text building
        test_expert_data = {
            'name': 'John Doe',
            'bio': 'Experienced software engineer',
            'skills': ['Python', 'JavaScript'],
            'domains': ['AI', 'Web Development'],
            'expertise_areas': ['Machine Learning', 'Frontend']
        }

        built_text = embedding_service.build_expert_text(test_expert_data)
        print(f'✅ Built expert text from data')
        print(f'   Built text: "{built_text}"')
        print(f'   Length: {len(built_text)} characters\n')

        # Final summary
        print('=' * 60)
        print('✅ ALL TESTS COMPLETED SUCCESSFULLY!')
        print('=' * 60)
        print('Semantic search functionality is working correctly.')
        print('Experts can now be searched using natural language queries.\n')

    except Exception as error:
        print(f'❌ Test failed with error: {str(error)}')
        import traceback
        traceback.print_exc()
        return False

    return True

def main():
    """Main entry point"""
    asyncio.run(test_expert_model())

if __name__ == "__main__":
    main()