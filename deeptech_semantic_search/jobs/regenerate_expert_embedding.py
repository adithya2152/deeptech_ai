"""
Regenerate Embedding for Single Expert
Utility script to update embedding for a specific expert

Usage: python jobs/regenerate_expert_embedding.py <expertId>
"""

import asyncio
import sys
import os
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.embedding_service import EmbeddingService
from services.database_service import DatabaseService

async def regenerate_expert_embedding(expert_id: str):
    """Regenerate embedding for a single expert"""
    print('🔄 Regenerating expert embedding...\n')
    print(f'Expert ID: {expert_id}\n')

    try:
        # Initialize services
        embedding_service = EmbeddingService()
        database_service = DatabaseService()

        # 1. Initialize embedding service
        print('📦 Loading AI model...')
        await embedding_service.initialize()
        print('✅ Model loaded\n')

        # 2. Initialize database connection
        await database_service.initialize()

        # 3. Fetch expert from database
        print('🔍 Fetching expert data...')
        expert = await database_service.get_expert_for_embedding(expert_id)

        if not expert:
            print(f'❌ Expert not found with ID: {expert_id}')
            print('Please check the expert ID and try again.\n')
            return None

        expert_name = expert.get('name', 'Unknown')
        print(f'✅ Found expert: {expert_name}\n')

        # 4. Build text representation
        print('📝 Building text representation...')
        expert_text = embedding_service.build_expert_text(expert)

        if not expert_text.strip():
            print('❌ Expert has no text content to embed')
            print('Profile appears to be empty. Please add bio, skills, or domains.\n')
            return None

        print(f'✅ Text length: {len(expert_text)} characters')
        print(f'Preview: "{expert_text[:100]}..."\n')

        # 5. Generate new embedding
        print('🧠 Generating embedding...')
        embedding = await embedding_service.generate_embedding(expert_text)
        print(f'✅ Generated {len(embedding)}-dimensional embedding\n')

        # 6. Update in database
        print('💾 Updating database...')
        result = await database_service.update_expert_embedding(expert_id, embedding, expert_text)

        print('✅ Successfully updated embedding!')
        print(f'   Expert: {expert_name}')
        print(f'   Updated at: {datetime.now()}')
        print(f'   Text length: {len(expert_text)} characters')
        print(f'   Embedding dimensions: {len(embedding)}\n')

        return result

    except Exception as error:
        print(f'❌ Error: {str(error)}')
        raise error

def main():
    """Main entry point"""
    if len(sys.argv) != 2:
        print('Usage: python jobs/regenerate_expert_embedding.py <expertId>')
        print('Example: python jobs/regenerate_expert_embedding.py abc-123-def')
        sys.exit(1)

    expert_id = sys.argv[1]
    asyncio.run(regenerate_expert_embedding(expert_id))

if __name__ == "__main__":
    main()