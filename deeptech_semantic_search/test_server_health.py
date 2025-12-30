#!/usr/bin/env python3
"""
Test script to start server and make a health check request
"""

import sys
import os
import asyncio
import threading
import time
import urllib.request
import json

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn
from main import app

def start_server():
    """Start the server in a separate thread"""
    print("🚀 Starting server in background thread...")
    try:
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=8001,
            log_level="info",
            reload=False
        )
    except Exception as e:
        print(f"❌ Server failed to start: {e}")
        import traceback
        traceback.print_exc()

def test_health():
    """Test the health endpoint"""
    print("⏳ Waiting for server to fully start...")
    time.sleep(10)  # Wait longer for server to start
    
    # Check if port is listening
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('127.0.0.1', 8001))
    sock.close()
    
    if result != 0:
        print("❌ Port 8001 is not listening")
        return False
    
    print("✅ Port 8001 is listening")
    
    try:
        print("🔍 Testing health endpoint...")
        with urllib.request.urlopen('http://127.0.0.1:8001/health') as response:
            data = json.loads(response.read().decode())
            print('✅ Health check successful!')
            print('Response:', json.dumps(data, indent=2))
            return True
    except Exception as e:
        print('❌ Health check failed:', e)
        return False

if __name__ == "__main__":
    # Start server in background thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # Test health endpoint
    success = test_health()

    if success:
        print("🎉 Server is working correctly!")
    else:
        print("💥 Server has issues")

    # Keep main thread alive briefly
    time.sleep(2)