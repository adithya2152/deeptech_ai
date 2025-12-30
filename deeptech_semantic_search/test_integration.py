"""
Integration Test: Connect semantic search microservice with main application
"""

import requests
import json
import time

def test_integration():
    """Test integration between semantic search microservice and main app"""

    print("🔗 Testing Semantic Search Integration")
    print("=" * 50)

    # Test 1: Health check
    try:
        response = requests.get("http://127.0.0.1:8000/health")
        print("✅ Microservice health check:", response.json())
    except Exception as e:
        print(f"❌ Microservice not running: {e}")
        return False

    # Test 2: Semantic search
    search_payload = {
        "query": "machine learning expert",
        "limit": 5,
        "threshold": 0.6
    }

    try:
        response = requests.post("http://127.0.0.1:8000/search", json=search_payload)
        if response.status_code == 200:
            results = response.json()
            print(f"✅ Search successful: {results['total_results']} results")
            if results['results']:
                print(f"Top result: {results['results'][0]['name']} (similarity: {results['results'][0]['similarity_score']:.3f})")
        else:
            print(f"❌ Search failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Search request failed: {e}")

    # Test 3: Batch embedding generation
    try:
        response = requests.post("http://127.0.0.1:8000/batch/embeddings")
        if response.status_code == 200:
            batch_result = response.json()
            print(f"✅ Batch embedding: {batch_result['updated']} updated, {batch_result['errors']} errors")
        else:
            print(f"⚠️  Batch embedding: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Batch embedding failed: {e}")

    print("\n🎯 Integration test completed!")
    return True

if __name__ == "__main__":
    test_integration()