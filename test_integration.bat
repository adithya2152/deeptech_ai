@echo off
echo 🚀 Starting DeepTech Semantic Search Integration Test
echo ========================================================

echo 📦 Starting Python semantic search microservice...
start /b cmd /c "cd c:\Users\nachi\Downloads\Deeptech\deeptech_semantic_search && python -c \"import uvicorn; from main import app; uvicorn.run(app, host='127.0.0.1', port=8000, log_level='warning')\""

echo ⏳ Waiting for Python service to start...
timeout /t 5 /nobreak >nul

echo 🔗 Testing Python service health...
curl -s http://127.0.0.1:8000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python service failed to start
    goto :cleanup
)

echo ✅ Python service is running

echo 🧪 Running Node.js integration test...
cd c:\Users\nachi\Downloads\Deeptech\deeptech_backend
node test_semantic_integration.js

:cleanup
echo 🛑 Stopping services...
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
echo ✅ Cleanup complete