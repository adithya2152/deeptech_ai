"""
Test the semantic search microservice
"""

import asyncio
import sys
import os
import time

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_server():
    """Test the server by starting it and making requests"""
    from main import app
    import uvicorn
    from multiprocessing import Process
    import requests

    # Start server in background process
    def run_server():
        uvicorn.run(app, host="127.0.0.1", port=8001, log_level="info")

    server_process = Process(target=run_server)
    server_process.start()

    # Wait for server to start
    time.sleep(3)

    try:
        # Test health endpoint
        response = requests.get("http://127.0.0.1:8001/health")
        print("✅ Health check response:", response.json())

        # Test root endpoint
        response = requests.get("http://127.0.0.1:8001/")
        print("✅ Root response:", response.json())

        print("🎉 Server is working correctly!")

    except Exception as e:
        print(f"❌ Test failed: {e}")
    finally:
        server_process.terminate()
        server_process.join()

if __name__ == "__main__":
    asyncio.run(test_server())