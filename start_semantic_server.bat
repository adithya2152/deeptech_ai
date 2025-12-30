@echo off
echo Starting DeepTech Semantic Search API...
cd /d %~dp0deeptech_semantic_search
set PYTHONPATH=%CD%
uvicorn main:app --host 127.0.0.1 --port 8000 --log-level info --reload
pause