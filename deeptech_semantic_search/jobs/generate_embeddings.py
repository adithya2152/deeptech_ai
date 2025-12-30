"""
Batch Embedding Generation Job
Generates semantic embeddings for all experts in the database

Run: python jobs/generate_embeddings.py
"""

import asyncio
import sys
import os
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.embedding_service import EmbeddingService
from services.database_service import DatabaseService

async def generate_all_expert_embeddings():
    """Generate embeddings for all experts"""
    print('🚀 Starting expert embedding generation...\n')

    try:
        # Initialize services
        embedding_service = EmbeddingService()
        database_service = DatabaseService()

        # 1. Initialize embedding service (loads AI model)
        print('📦 Loading AI model...')
        await embedding_service.initialize()
        print('✅ Model loaded successfully\n')

        # 2. Initialize database connection
        print('🔗 Connecting to database...')
        await database_service.initialize()
        print('✅ Database connected\n')

        # 3. Fetch experts needing embeddings
        print('🔍 Fetching experts from database...')
        experts = await database_service.get_experts_needing_embeddings()
        print(f'Found {len(experts)} experts to process\n')

        if len(experts) == 0:
            print('✨ All experts already have up-to-date embeddings!')
            print('Nothing to do. Exiting...\n')
            return {
                'processed': 0,
                'updated': 0,
                'errors': 0,
                'skipped': 0
            }

        # 4. Process each expert
        processed = 0
        updated = 0
        errors = 0
        skipped = 0

        print('⚙️  Processing experts...\n')

        for expert in experts:
            try:
                # Build text representation from expert profile
                expert_text = embedding_service.build_expert_text(expert)

                # Skip if no content
                if not expert_text.strip():
                    print(f'⚠️  Skipping expert {expert["id"]} ({expert.get("name", "Unknown")}) - no text content')
                    skipped += 1
                    processed += 1
                    continue

                # Generate embedding (384-dimensional vector)
                embedding = await embedding_service.generate_embedding(expert_text)

                # Store in database
                await database_service.update_expert_embedding(expert['id'], embedding, expert_text)

                updated += 1
                processed += 1

                # Progress indicator (every 5 experts)
                if processed % 5 == 0:
                    percentage = (processed / len(experts) * 100).toFixed(1)
                    print(f'📊 Progress: {processed}/{len(experts)} ({percentage}%) - {updated} updated, {errors} errors, {skipped} skipped')

            except Exception as error:
                print(f'❌ Error processing expert {expert["id"]} ({expert.get("name", "Unknown")}): {str(error)}')
                errors += 1
                processed += 1

            # Small delay to avoid overwhelming the system
            if processed % 10 == 0:
                await asyncio.sleep(0.1)

        # 5. Final summary
        print('\n' + '=' * 60)
        print('✅ EMBEDDING GENERATION COMPLETE!')
        print('=' * 60)
        print(f'Total processed:       {processed}')
        print(f'Successfully updated:  {updated} ✅')
        print(f'Errors:                {errors} {"❌" if errors > 0 else ""}')
        print(f'Skipped (no content):  {skipped} {"⚠️" if skipped > 0 else ""}')
        print('='.repeat(60) + '\n')

        if updated > 0:
            print('🎉 Experts are now ready for semantic search!\n')

        return {
            'processed': processed,
            'updated': updated,
            'errors': errors,
            'skipped': skipped
        }

    except Exception as error:
        print(f'\n💥 FATAL ERROR: {str(error)}')
        raise error

async def generate_single_expert_embedding(expert_id: str):
    """Generate embedding for a single expert (by ID)"""
    print(f'🚀 Generating embedding for expert: {expert_id}\n')

    try:
        # Initialize services
        embedding_service = EmbeddingService()
        database_service = DatabaseService()

        await embedding_service.initialize()
        await database_service.initialize()

        # Get expert data
        expert = await database_service.get_expert_for_embedding(expert_id)
        if not expert:
            raise ValueError(f'Expert not found: {expert_id}')

        # Build text representation
        expert_text = embedding_service.build_expert_text(expert)
        if not expert_text.strip():
            raise ValueError('Expert has no text content to embed')

        # Generate embedding
        embedding = await embedding_service.generate_embedding(expert_text)

        # Store in database
        result = await database_service.update_expert_embedding(expert_id, embedding, expert_text)

        print('✅ Successfully updated embedding')
        print(f'   Updated at: {datetime.now()}')
        print(f'   Text length: {len(expert_text)} characters\n')

        return result

    except Exception as error:
        print(f'❌ Error: {str(error)}')
        raise error

def main():
    """Main entry point"""
    if len(sys.argv) > 1:
        # Single expert mode
        expert_id = sys.argv[1]
        asyncio.run(generate_single_expert_embedding(expert_id))
    else:
        # Batch mode (all experts)
        asyncio.run(generate_all_expert_embeddings())

if __name__ == "__main__":
    main()