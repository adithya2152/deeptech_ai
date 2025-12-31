import asyncio
import os
from dotenv import load_dotenv
load_dotenv()
from services.database_service import DatabaseService

async def test():
    db = DatabaseService()
    await db.initialize()

    # Test with a simple embedding
    test_embedding = [0.1] * 384
    results = await db.search_similar_experts(test_embedding, limit=2)

    print('Raw database results:')
    for i, result in enumerate(results):
        print(f'Expert {i+1}:')
        print(f'  id: {result["id"]} (type: {type(result["id"])})')
        print(f'  name: {result["name"]}')
        print(f'  hourly_rate_advisory: {result["hourly_rate_advisory"]}')
        print(f'  availability: {result["availability"]} (type: {type(result["availability"])})')
        print()

if __name__ == "__main__":
    asyncio.run(test())</content>
<parameter name="filePath">C:\Users\nachi\Downloads\Deeptech\deeptech_semantic_search\debug_db.py