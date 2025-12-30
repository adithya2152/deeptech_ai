import asyncio
import os
from services.database_service import DatabaseService
from dotenv import load_dotenv
load_dotenv()

async def check_schema():
    db = DatabaseService()
    await db.initialize()

    async with db.get_connection() as conn:
        # Get column info for experts table
        result = await conn.fetch('SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = \'experts\' ORDER BY ordinal_position')
        print('Experts table schema:')
        for row in result:
            col_name = row['column_name']
            data_type = row['data_type']
            nullable = row['is_nullable']
            print(f'  {col_name}: {data_type} (nullable: {nullable})')

        # Check a sample expert record
        sample = await conn.fetch('SELECT id, availability, hourly_rate_advisory, hourly_rate_architecture, hourly_rate_execution FROM experts LIMIT 1')
        if sample:
            print(f'\nSample expert data: {dict(sample[0])}')

        # Check what availability looks like
        avail = await conn.fetch('SELECT availability FROM experts LIMIT 3')
        print(f'\nAvailability values: {[dict(row) for row in avail]}')

asyncio.run(check_schema())