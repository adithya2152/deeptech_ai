"""
Seed Database with Test Experts
Adds sample expert profiles to the database for testing semantic search

Run: python seed_experts.py
"""

import asyncio
import sys
import os
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.database_service import DatabaseService

async def seed_experts():
    """Add test experts to database"""
    print('🌱 Seeding database with test experts...\n')

    try:
        # Initialize database
        db_service = DatabaseService()
        await db_service.initialize()

        async with db_service.get_connection() as conn:
            # Test experts data
            experts_data = [
                {
                    'id': '550e8400-e29b-41d4-a716-446655440001',
                    'name': 'John Doe',
                    'email': 'john.doe@example.com',
                    'bio': 'Experienced machine learning engineer with 5 years in AI development',
                    'skills': ['Python', 'TensorFlow', 'PyTorch', 'Machine Learning'],
                    'domains': ['AI', 'Machine Learning', 'Computer Vision'],
                    'hourly_rate_advisory': 150.0,
                    'hourly_rate_architecture': 200.0,
                    'hourly_rate_execution': 120.0,
                    'vetting_status': 'approved',
                    'rating': 4.8,
                    'review_count': 25,
                    'total_hours': 500,
                    'availability': True
                },
                {
                    'id': '550e8400-e29b-41d4-a716-446655440002',
                    'name': 'Jane Smith',
                    'email': 'jane.smith@example.com',
                    'bio': 'Data scientist with expertise in computer vision and deep learning',
                    'skills': ['Python', 'OpenCV', 'TensorFlow', 'Computer Vision'],
                    'domains': ['Data Science', 'Computer Vision', 'AI'],
                    'hourly_rate_advisory': 140.0,
                    'hourly_rate_architecture': 180.0,
                    'hourly_rate_execution': 110.0,
                    'vetting_status': 'approved',
                    'rating': 4.9,
                    'review_count': 30,
                    'total_hours': 600,
                    'availability': True
                },
                {
                    'id': '550e8400-e29b-41d4-a716-446655440003',
                    'name': 'Bob Johnson',
                    'email': 'bob.johnson@example.com',
                    'bio': 'Blockchain developer specializing in smart contracts and DeFi',
                    'skills': ['Solidity', 'Web3.js', 'Ethereum', 'Smart Contracts'],
                    'domains': ['Blockchain', 'DeFi', 'Cryptocurrency'],
                    'hourly_rate_advisory': 160.0,
                    'hourly_rate_architecture': 220.0,
                    'hourly_rate_execution': 130.0,
                    'vetting_status': 'approved',
                    'rating': 4.7,
                    'review_count': 20,
                    'total_hours': 400,
                    'availability': False
                },
                {
                    'id': '550e8400-e29b-41d4-a716-446655440004',
                    'name': 'Alice Brown',
                    'email': 'alice.brown@example.com',
                    'bio': 'Full-stack developer with React, Node.js, and cloud expertise',
                    'skills': ['JavaScript', 'React', 'Node.js', 'AWS'],
                    'domains': ['Web Development', 'Cloud Computing', 'DevOps'],
                    'hourly_rate_advisory': 120.0,
                    'hourly_rate_architecture': 160.0,
                    'hourly_rate_execution': 100.0,
                    'vetting_status': 'approved',
                    'rating': 4.6,
                    'review_count': 35,
                    'total_hours': 700,
                    'availability': True
                }
            ]

            print(f'📝 Inserting {len(experts_data)} test experts...')

            for expert in experts_data:
                # Insert into users first (for Supabase auth)
                await conn.execute("""
                    INSERT INTO auth.users (id, email, created_at, updated_at, last_sign_in_at)
                    VALUES ($1, $2, NOW(), NOW(), NOW())
                    ON CONFLICT (id) DO NOTHING
                """, expert['id'], expert['email'])

                # Insert into profiles
                await conn.execute("""
                    INSERT INTO profiles (id, email, first_name, last_name, role, email_verified, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, 'expert', true, NOW(), NOW())
                    ON CONFLICT (id) DO NOTHING
                """, expert['id'], expert['email'], expert['name'].split()[0], ' '.join(expert['name'].split()[1:]))

                # Insert into experts
                await conn.execute("""
                    INSERT INTO experts (
                        id, experience_summary, domains, skills, expertise_areas,
                        hourly_rate_advisory, hourly_rate_architecture, hourly_rate_execution,
                        vetting_status, rating, review_count, total_hours, availability,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
                    ON CONFLICT (id) DO NOTHING
                """, expert['id'], expert['bio'], expert['domains'], expert['skills'], expert['domains'],
                     expert['hourly_rate_advisory'], expert['hourly_rate_architecture'], expert['hourly_rate_execution'],
                     expert['vetting_status'], expert['rating'], expert['review_count'], expert['total_hours'],
                     None)

                print(f'  ✅ Added {expert["name"]}')

            print(f'\n✅ Successfully seeded {len(experts_data)} test experts!')
            print('Now run: python jobs/generate_embeddings.py')

    except Exception as e:
        print(f'❌ Error seeding database: {e}')
        import traceback
        traceback.print_exc()
    finally:
        if db_service.pool:
            await db_service.pool.close()

if __name__ == '__main__':
    asyncio.run(seed_experts())