@echo off
cd c:\Users\nachi\Downloads\Deeptech
set PYTHONPATH=deeptech_semantic_search
uvicorn deeptech_semantic_search.main:app --host 127.0.0.1 --port 8002 --log-level info
pause