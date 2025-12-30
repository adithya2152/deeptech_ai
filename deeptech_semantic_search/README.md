# DeepTech Semantic Search Microservice

A FastAPI-based microservice for AI-powered semantic search of experts using sentence-transformers and PostgreSQL with pgvector.

## Features

- **Semantic Search**: Natural language search for experts using AI embeddings
- **Batch Processing**: Generate embeddings for all experts at once
- **Real-time Updates**: Regenerate embeddings for individual experts
- **Filtering**: Combine semantic search with traditional filters (domain, rate, rating, etc.)
- **FastAPI**: Modern, fast web framework with automatic API documentation
- **PostgreSQL + pgvector**: Efficient vector similarity search

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Main API      │    │  Embedding       │    │   Database      │
│   (FastAPI)     │◄──►│  Service         │◄──►│   Service       │
│                 │    │  (sentence-     │    │   (PostgreSQL + │
│ - /search       │    │   transformers)  │    │    pgvector)    │
│ - /batch        │    │                  │    │                 │
│ - /health       │    │ - Generate       │    │ - Store         │
└─────────────────┘    │   embeddings     │    │   embeddings    │
                       │ - Similarity     │    │ - Search        │
                       │   calculation    │    │   similar       │
                       └──────────────────┘    │   experts       │
                                               └─────────────────┘
```

## Setup

### Prerequisites

- Python 3.8+
- PostgreSQL with pgvector extension
- Supabase account (for cloud database)

### Installation

1. **Clone/Create the microservice directory**
   ```bash
   cd deeptech_semantic_search
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**
   - Copy `.env` and update database connection string
   - Ensure pgvector extension is enabled in your PostgreSQL database

4. **Run database migrations**
   - Ensure your experts table has the required columns:
     ```sql
     ALTER TABLE experts ADD COLUMN embedding vector(384);
     ALTER TABLE experts ADD COLUMN embedding_text text;
     ALTER TABLE experts ADD COLUMN embedding_updated_at timestamp;
     ```

## Usage

### Start the Service

```bash
python main.py
```

Or with uvicorn:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### API Endpoints

#### Health Check
```http
GET /health
```

#### Semantic Search
```http
POST /search
Content-Type: application/json

{
  "query": "machine learning expert with Python experience",
  "limit": 5,
  "threshold": 0.8,
  "filters": {
    "domain": "AI",
    "min_hourly_rate": 50,
    "vetting_status": "approved"
  }
}
```

#### Update Single Expert Embedding
```http
POST /experts/{expert_id}/embedding
```

#### Batch Generate Embeddings
```http
POST /batch/embeddings
```

### Integration with Main Backend

The microservice can be called from your Node.js backend:

```javascript
// Example: Search for experts
const response = await fetch('http://localhost:8000/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'blockchain developer',
    limit: 10
  })
});

const results = await response.json();
```

## Development

### Running Tests

```bash
pytest
```

### API Documentation

When running, visit `http://localhost:8000/docs` for interactive API documentation.

## Configuration

### Environment Variables

- `SUPABASE_CONNECTION_STRING`: PostgreSQL connection string
- `SERVICE_PORT`: Port to run the service on (default: 8000)
- `EMBEDDING_MODEL`: Sentence transformer model (default: all-MiniLM-L6-v2)
- `DEFAULT_SEARCH_LIMIT`: Default number of results (default: 10)
- `DEFAULT_SIMILARITY_THRESHOLD`: Default similarity threshold (default: 0.7)

### Model Options

The service uses `all-MiniLM-L6-v2` by default, which provides:
- 384-dimensional embeddings
- Good balance of speed and quality
- ~23MB model size

Alternative models:
- `all-mpnet-base-v2`: Higher quality (768-dim), slower
- `paraphrase-MiniLM-L6-v2`: Good for paraphrase detection

## Performance

### Embedding Generation
- First run: ~10-30 seconds to load model
- Per expert: ~50-200ms depending on text length
- Batch processing recommended for multiple experts

### Search Performance
- Vector similarity search is very fast (< 10ms per query)
- Scales well with database indexing
- Cosine similarity calculation is optimized

## Deployment

### Docker

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Considerations

- Use gunicorn for production serving
- Enable database connection pooling
- Configure proper CORS settings
- Add authentication/authorization
- Monitor model memory usage
- Implement rate limiting

## Troubleshooting

### Common Issues

1. **Model loading fails**: Check internet connection and disk space
2. **Database connection fails**: Verify connection string and pgvector extension
3. **Out of memory**: Use smaller model or increase RAM
4. **Slow embedding generation**: Process in smaller batches

### Logs

Check application logs for detailed error messages and performance metrics.