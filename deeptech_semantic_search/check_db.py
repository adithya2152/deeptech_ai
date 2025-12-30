import sys
import os
current_dir = os.getcwd()
sys.path.insert(0, current_dir)
import asyncio
from services.database_service import DatabaseService

async def check_experts():
    ds = DatabaseService()
    await ds.initialize()

    # Check what experts exist
    experts = await ds.pool.fetch('SELECT id, experience_summary, embedding IS NOT NULL as has_embedding FROM experts LIMIT 5')
    print('Experts in database:')
    for expert in experts:
        summary = expert['experience_summary'][:50] + '...' if expert['experience_summary'] and len(expert['experience_summary']) > 50 else expert['experience_summary'] or 'No summary'
        print(f'  {expert["id"]}: {summary} - embedding: {expert["has_embedding"]}')

    # Check embedding data
    embeddings = await ds.pool.fetch('SELECT id, embedding[1:5] as embedding_preview FROM experts WHERE embedding IS NOT NULL LIMIT 3')
    print('\nEmbedding previews:')
    for emb in embeddings:
        print(f'  {emb["id"]}: {emb["embedding_preview"]}')

asyncio.run(check_experts())