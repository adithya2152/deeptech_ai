"""
Integration Test with Server Lifecycle
Tests the complete semantic search workflow by starting the server, running tests, and stopping it
"""

import asyncio
import requests
import time
import subprocess
import sys
import os
import signal
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def start_server():
    """Start the FastAPI server in background"""
    print("🚀 Starting FastAPI server...")

    # Start server as subprocess
    cmd = [sys.executable, "-c", """
import uvicorn
from main import app
print('Server starting...')
uvicorn.run(app, host='127.0.0.1', port=8000, log_level='warning')
"""]

    process = subprocess.Popen(
        cmd,
        cwd=os.path.dirname(os.path.abspath(__file__)),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
    )

    # Wait for server to start
    time.sleep(3)

    return process

def stop_server(process):
    """Stop the server process"""
    print("🛑 Stopping server...")
    try:
        if os.name == 'nt':
            process.terminate()
        else:
            os.kill(process.pid, signal.SIGTERM)
        process.wait(timeout=5)
    except:
        process.kill()

async def test_integration():
    """Run integration tests"""
    print("🧪 Semantic Search Integration Test")
    print("=" * 50)

    server_process = None

    try:
        # Start server
        server_process = start_server()

        # Test 1: Health check
        print("Test 1: Health Check")
        print("-" * 30)
        try:
            response = requests.get("http://127.0.0.1:8000/health", timeout=5)
            if response.status_code == 200:
                print("✅ Health check passed")
                print(f"   Response: {response.json()}")
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Health check error: {e}")
            return False

        # Test 2: Search endpoint
        print("\nTest 2: Semantic Search")
        print("-" * 30)
        try:
            search_data = {
                "query": "machine learning expert",
                "limit": 3
            }
            response = requests.post("http://127.0.0.1:8000/search", json=search_data, timeout=10)
            if response.status_code == 200:
                results = response.json()
                print("✅ Search request successful")
                print(f"   Found {len(results.get('results', []))} results")
                if results.get('results'):
                    print(f"   Sample result: {results['results'][0].get('name', 'Unknown')}")
            else:
                print(f"❌ Search failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Search error: {e}")

        # Test 3: Batch embedding generation
        print("\nTest 3: Batch Embedding Generation")
        print("-" * 30)
        try:
            response = requests.post("http://127.0.0.1:8000/batch/embeddings", timeout=30)
            if response.status_code == 200:
                batch_result = response.json()
                print("✅ Batch embedding successful")
                print(f"   Updated: {batch_result.get('updated', 0)}")
                print(f"   Errors: {batch_result.get('errors', 0)}")
            else:
                print(f"❌ Batch embedding failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Batch embedding error: {e}")

        print("\n🎉 Integration tests completed!")
        return True

    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        return False

    finally:
        # Clean up
        if server_process:
            stop_server(server_process)

def main():
    """Main entry point"""
    success = asyncio.run(test_integration())
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()