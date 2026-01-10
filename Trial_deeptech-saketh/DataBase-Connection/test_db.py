from database import DatabaseService
import json

def test_connection():
    print("🔌 Connecting to Supabase...")
    
    # 1. Fetch recent experts (Fixes your previous crash)
    experts = DatabaseService.get_recent_experts(limit=5)
    
    if not experts:
        print("❌ No experts found in database.")
        return

    test_user_id = str(experts[0]['id'])
    test_user_name = experts[0]['name']
    
    print(f"✅ Found Expert: {test_user_name}")
    print(f"   ID: {test_user_id}")
    print("-" * 50)

    # 2. Fetch All Scoring Metrics (Read-Only)
    print("\n🔍 Fetching Raw Scoring Metrics...")
    metrics = DatabaseService.get_scoring_metrics(test_user_id)
    
    if metrics:
        # Display the Raw Data
        print(json.dumps(metrics, indent=2, default=str))
        print("\n✅ Fetch Complete.")
    else:
        print("❌ Failed to fetch metrics.")

if __name__ == "__main__":
    test_connection()