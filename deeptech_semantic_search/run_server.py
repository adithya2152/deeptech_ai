#!/usr/bin/env python3
"""
Run the FastAPI semantic search server
"""

import sys
import os
import logging

# Add current directory to Python path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("🚀 Starting DeepTech Semantic Search API...")
logger.info(f"Python path: {sys.path[:3]}")
logger.info(f"Current directory: {current_dir}")

try:
    logger.info("Importing main module...")
    from main import app
    logger.info("✅ Main module imported successfully")

    logger.info("Importing uvicorn...")
    import uvicorn
    logger.info("✅ Uvicorn imported successfully")

    logger.info("Starting uvicorn server...")
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="info",
        reload=False,  # Disable reload to prevent shutdown issues
        access_log=True
    )
except Exception as e:
    logger.error(f"❌ Failed to start server: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)