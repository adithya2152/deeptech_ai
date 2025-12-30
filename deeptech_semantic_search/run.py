#!/usr/bin/env python3
"""
Run script for DeepTech Semantic Search API
"""

import sys
import os

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn
from main import app

if __name__ == "__main__":
    print("🚀 Starting DeepTech Semantic Search API...")
    print("📍 Server will be available at: http://127.0.0.1:8001")
    print("📖 API documentation at: http://127.0.0.1:8001/docs")

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8001,
        log_level="info",
        reload=False
    )