"""
Install pgvector Extension
Installs the pgvector extension required for vector similarity search
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

async def install_pgvector_extension():
    """Install the pgvector extension in the database"""

    print("🔧 Installing pgvector extension...")
    print("=" * 50)

    # Initialize database service
    db_service = DatabaseService()

    try:
        await db_service.initialize()

        async with db_service.get_connection() as conn:
            # Check if extension already exists
            check_query = """
            SELECT extname, extversion
            FROM pg_extension
            WHERE extname = 'vector'
            """

            existing = await conn.fetchrow(check_query)

            if existing:
                print(f"✅ pgvector extension already installed (version {existing['extversion']})")
                return True

            # Try to create the extension
            print("📦 Creating pgvector extension...")
            try:
                await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
                print("✅ pgvector extension installed successfully")

                # Verify installation
                result = await conn.fetchrow(check_query)
                if result:
                    print(f"✅ Verified: pgvector extension version {result['extversion']}")
                    return True
                else:
                    print("❌ Extension created but not found in pg_extension")
                    return False

            except Exception as e:
                print(f"❌ Failed to create pgvector extension: {str(e)}")
                print("\n💡 This might be because:")
                print("   - pgvector is not installed on the PostgreSQL server")
                print("   - You don't have permission to create extensions")
                print("   - The extension needs to be installed by a database administrator")
                print("\n🔗 For Supabase, pgvector should be available.")
                print("   Contact Supabase support if it's not working.")
                return False

    except Exception as e:
        print(f"❌ Error during pgvector installation: {str(e)}")
        return False

async def add_embedding_column():
    """Add the embedding column now that pgvector is installed"""

    print("\n🔧 Adding embedding column...")
    print("=" * 30)

    db_service = DatabaseService()

    try:
        await db_service.initialize()

        async with db_service.get_connection() as conn:
            # Check if column already exists
            column_check = await conn.fetchrow("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'experts' AND column_name = 'embedding'
            """)

            if column_check:
                print("✅ Embedding column already exists")
                return True

            # Add the embedding column
            print("📝 Adding embedding column (VECTOR(384))...")
            await conn.execute("ALTER TABLE experts ADD COLUMN embedding VECTOR(384)")

            # Verify
            verify_check = await conn.fetchrow("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'experts' AND column_name = 'embedding'
            """)

            if verify_check:
                print(f"✅ Embedding column added: {verify_check['data_type']}")
                return True
            else:
                print("❌ Embedding column was not added")
                return False

    except Exception as e:
        print(f"❌ Failed to add embedding column: {str(e)}")
        return False

async def main():
    """Main installation process"""
    print("🚀 pgvector Setup for Semantic Search")
    print("=" * 50)

    # Step 1: Install pgvector extension
    extension_success = await install_pgvector_extension()

    if not extension_success:
        print("\n❌ pgvector extension installation failed.")
        print("Cannot proceed with embedding column setup.")
        return False

    # Step 2: Add embedding column
    column_success = await add_embedding_column()

    if column_success:
        print("\n🎉 pgvector setup completed successfully!")
        print("The database now supports vector similarity search.")
        return True
    else:
        print("\n❌ Embedding column setup failed.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)