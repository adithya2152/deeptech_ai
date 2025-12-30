"""
Database Migration: Add Semantic Search Columns
Adds embedding-related columns to the experts table for AI-powered search
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.database_service import DatabaseService

async def add_semantic_search_columns():
    """Add the missing columns needed for semantic search"""

    print("🔄 Adding semantic search columns to experts table...")
    print("=" * 60)

    # Initialize database service
    db_service = DatabaseService()

    try:
        await db_service.initialize()

        async with db_service.get_connection() as conn:
            # Check which columns already exist
            existing_columns_query = """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'experts'
            AND column_name IN ('embedding', 'embedding_text', 'embedding_updated_at', 'skills', 'expertise_areas')
            """

            existing_rows = await conn.fetch(existing_columns_query)
            existing_columns = {row['column_name'] for row in existing_rows}

            print(f"Existing columns: {sorted(existing_columns)}")

            # Columns to add
            columns_to_add = {
                'skills': "ALTER TABLE experts ADD COLUMN skills TEXT[] DEFAULT '{}'::TEXT[]",
                'expertise_areas': "ALTER TABLE experts ADD COLUMN expertise_areas TEXT[] DEFAULT '{}'::TEXT[]",
                'embedding': "ALTER TABLE experts ADD COLUMN embedding VECTOR(384)",
                'embedding_text': "ALTER TABLE experts ADD COLUMN embedding_text TEXT",
                'embedding_updated_at': "ALTER TABLE experts ADD COLUMN embedding_updated_at TIMESTAMP WITH TIME ZONE"
            }

            added_count = 0

            for column_name, alter_sql in columns_to_add.items():
                if column_name not in existing_columns:
                    print(f"📝 Adding column: {column_name}")
                    try:
                        await conn.execute(alter_sql)
                        print(f"✅ Added column: {column_name}")
                        added_count += 1
                    except Exception as e:
                        print(f"❌ Failed to add column {column_name}: {str(e)}")
                else:
                    print(f"⏭️  Column already exists: {column_name}")

            print(f"\n✅ Migration completed! Added {added_count} columns.")

            # Verify the final schema
            print("\n🔍 Verifying final schema...")
            final_columns_query = """
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'experts'
            AND column_name IN ('embedding', 'embedding_text', 'embedding_updated_at', 'skills', 'expertise_areas')
            ORDER BY column_name
            """

            final_rows = await conn.fetch(final_columns_query)
            print("Final embedding-related columns:")
            for row in final_rows:
                print(f"  - {row['column_name']}: {row['data_type']}")

    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        raise e

    print("\n🎉 Semantic search columns migration completed successfully!")
    print("The experts table now supports AI-powered semantic search.")

if __name__ == "__main__":
    asyncio.run(add_semantic_search_columns())