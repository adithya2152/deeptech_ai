#!/usr/bin/env python3
"""
Script to inspect the experts table schema and display all columns
"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from services.database_service import DatabaseService

# Load environment variables from .env file
load_dotenv()

async def inspect_experts_schema():
    """Inspect and display the experts table schema"""

    # Initialize database service
    db_service = DatabaseService()

    try:
        # Initialize connection
        await db_service.initialize()

        # Query to get column information from information_schema
        schema_query = """
        SELECT
            column_name,
            data_type,
            is_nullable,
            column_default,
            ordinal_position
        FROM information_schema.columns
        WHERE table_name = 'experts'
        ORDER BY ordinal_position
        """

        # Query to get column information from information_schema
        schema_query = """
        SELECT
            column_name,
            data_type,
            is_nullable,
            column_default,
            ordinal_position
        FROM information_schema.columns
        WHERE table_name = 'experts'
        ORDER BY ordinal_position
        """

        # Also check for embedding-related columns specifically
        embedding_check_query = """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'experts'
        AND column_name IN ('embedding', 'embedding_text', 'embedding_updated_at', 'skills', 'expertise_areas')
        """

        print("Inspecting experts table schema...")
        print("=" * 60)

        async with db_service.get_connection() as conn:
            # Check for embedding columns
            embedding_rows = await conn.fetch(embedding_check_query)
            embedding_columns = [row['column_name'] for row in embedding_rows]

            rows = await conn.fetch(schema_query)

            if not rows:
                print("No columns found in experts table")
                return

            print(f"Found {len(rows)} columns in experts table:\n")

            # Print header
            print(f"{'Position':<10} {'Column Name':<25} {'Data Type':<20} {'Nullable':<10} {'Default'}")
            print("-" * 80)

            # Print each column
            for row in rows:
                position = row['ordinal_position']
                name = row['column_name']
                data_type = row['data_type']
                nullable = "YES" if row['is_nullable'] == 'YES' else "NO"
                default = row['column_default'] or ""

                # Mark embedding-related columns
                marker = " <-- EMBEDDING" if name in ['embedding', 'embedding_text', 'embedding_updated_at'] else ""
                marker += " <-- USED IN CODE" if name in ['skills', 'expertise_areas'] else ""

                print(f"{position:<10} {name:<25} {data_type:<20} {nullable:<10} {default}{marker}")

            print("\n" + "-" * 40)
            print("Embedding-related columns found:", embedding_columns if embedding_columns else "None")
            print("Missing columns referenced in code:", [col for col in ['skills', 'expertise_areas'] if col not in [row['column_name'] for row in rows]])

        print("\n" + "=" * 60)
        print("Schema inspection completed successfully")

    except Exception as e:
        print(f"Error inspecting schema: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    # Check if connection string is set
    if not os.getenv('SUPABASE_CONNECTION_STRING'):
        print("Error: SUPABASE_CONNECTION_STRING environment variable not set")
        print("Please set the environment variable and try again")
        sys.exit(1)

    # Run the inspection
    asyncio.run(inspect_experts_schema())