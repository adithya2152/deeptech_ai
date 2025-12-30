#!/usr/bin/env python3
"""
Simple script to check what columns exist in the experts table
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def check_experts_columns():
    """Check and display columns in the experts table"""

    connection_string = os.getenv('SUPABASE_CONNECTION_STRING')
    if not connection_string:
        print("Error: SUPABASE_CONNECTION_STRING environment variable not set")
        return

    try:
        # Connect to database
        conn = await asyncpg.connect(connection_string)

        # Query to get column names from experts table
        query = """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'experts'
        AND table_schema = 'public'
        ORDER BY ordinal_position
        """

        rows = await conn.fetch(query)

        if not rows:
            print("No columns found in experts table")
        else:
            print(f"Found {len(rows)} columns in experts table:")
            print("-" * 40)
            for row in rows:
                print(f"{row['column_name']} ({row['data_type']})")

        await conn.close()

    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(check_experts_columns())