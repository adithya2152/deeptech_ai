# Integration Guide: AI Scoring System → DeepTech Backend

## Overview
This guide explains how to integrate the Python AI scoring system with your Node.js/Express backend.

## Architecture

```
┌─────────────────────┐
│   Frontend (React)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Backend (Node.js)  │◄──────┐
│     Port 5000       │       │
└──────────┬──────────┘       │
           │                   │
           │              ┌────┴────────────────┐
           │              │  Python Scoring     │
           │              │  Microservice       │
           ▼              │  (Flask/FastAPI)    │
┌─────────────────────┐  └─────────────────────┘
│  PostgreSQL + pgvector │
└─────────────────────┘
```

## Method 1: Python Microservice (Recommended)

### Step 1: Create Flask API Wrapper

Create `c:\Users\nachi\Downloads\Deeptech\deeptech_backend\scoring_service\server.py`:

```python
from flask import Flask, request, jsonify
from scoring_algorithm import ExpertScoringSystem
import asyncpg
import os
import json

app = Flask(__name__)

# Database connection
async def get_expert_data_from_db(expert_id):
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    query = '''
    SELECT 
        e.id,
        p.first_name || ' ' || p.last_name as name,
        e.domains,
        e.experience_summary,
        e.years_experience,
        e.skills,
        e.papers,
        e.patents,
        e.products,
        e.rating,
        e.review_count,
        -- Get contract stats
        (SELECT COUNT(*) FROM contracts WHERE expert_id = e.id) as total_contracts,
        (SELECT COUNT(*) FROM contracts WHERE expert_id = e.id AND status = 'completed') as completed_contracts,
        -- Add more fields as needed
    FROM experts e
    JOIN profiles p ON e.id = p.id
    WHERE e.id = $1
    '''
    
    row = await conn.fetchrow(query, expert_id)
    await conn.close()
    
    return dict(row)

@app.route('/api/scoring/calculate/<expert_id>', methods=['POST'])
async def calculate_score(expert_id):
    try:
        # Fetch expert data from database
        expert_data = await get_expert_data_from_db(expert_id)
        
        # Calculate scores
        scoring_system = ExpertScoringSystem(expert_data)
        scores = scoring_system.calculate_all_scores()
        tier = scoring_system.determine_rank_tier()
        tags = scoring_system.assign_tags()
        
        result = {
            'expert_id': expert_id,
            'scores': {
                'overall': scores.overall_score,
                'expertise': scores.expertise_score,
                'performance': scores.performance_score,
                'reliability': scores.reliability_score,
                'quality': scores.quality_score,
                'engagement': scores.engagement_score,
                'resume': scores.resume_score
            },
            'tier': tier,
            'tags': tags,
            'calculated_at': datetime.now().isoformat()
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8001)
```

### Step 2: Node.js Integration

Add to `deeptech_backend/services/scoringService.js`:

```javascript
import axios from 'axios';

const SCORING_SERVICE_URL = process.env.SCORING_SERVICE_URL || 'http://localhost:8001';

export const calculateExpertScore = async (expertId) => {
  try {
    const response = await axios.post(
      `${SCORING_SERVICE_URL}/api/scoring/calculate/${expertId}`,
      {},
      { timeout: 30000 }
    );
    return response.data;
  } catch (error) {
    console.error('Scoring service error:', error);
    throw error;
  }
};

export const saveScoresToDatabase = async (expertId, scores) => {
  const sql = `
    INSERT INTO user_scores (
      user_id, 
      expertise_score, 
      performance_score, 
      reliability_score, 
      quality_score, 
      engagement_score, 
      overall_score,
      last_calculated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET
      expertise_score = $2,
      performance_score = $3,
      reliability_score = $4,
      quality_score = $5,
      engagement_score = $6,
      overall_score = $7,
      last_calculated_at = NOW()
    RETURNING *
  `;
  
  const values = [
    expertId,
    scores.expertise,
    scores.performance,
    scores.reliability,
    scores.quality,
    scores.engagement,
    scores.overall
  ];
  
  const { rows } = await pool.query(sql, values);
  return rows[0];
};
```

### Step 3: Controller Integration

Add to `deeptech_backend/controllers/scoringController.js`:

```javascript
import { calculateExpertScore, saveScoresToDatabase } from '../services/scoringService.js';

export const recalculateExpertScore = async (req, res) => {
  try {
    const { expertId } = req.params;
    
    // Call Python scoring service
    const scoringResult = await calculateExpertScore(expertId);
    
    // Save to database
    await saveScoresToDatabase(expertId, scoringResult.scores);
    
    // Update tier
    await updateUserRankTier(expertId, scoringResult.tier);
    
    // Update tags
    await updateUserTags(expertId, scoringResult.tags);
    
    res.json({
      success: true,
      data: scoringResult
    });
    
  } catch (error) {
    console.error('Score calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate scores'
    });
  }
};

export const getExpertScores = async (req, res) => {
  try {
    const { expertId } = req.params;
    
    const query = `
      SELECT * FROM user_scores 
      WHERE user_id = $1
    `;
    
    const { rows } = await pool.query(query, [expertId]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Scores not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
    
  } catch (error) {
    console.error('Get scores error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve scores'
    });
  }
};
```

### Step 4: Routes

Add to `deeptech_backend/routes/scoringRoutes.js`:

```javascript
import express from 'express';
import { recalculateExpertScore, getExpertScores } from '../controllers/scoringController.js';
import { auth } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';

const router = express.Router();

// Get expert scores
router.get('/:expertId', auth, getExpertScores);

// Recalculate scores (admin only)
router.post('/recalculate/:expertId', auth, rbac(['admin']), recalculateExpertScore);

export default router;
```

### Step 5: Automatic Triggers

Add database trigger to recalculate on events:

```sql
-- Trigger function
CREATE OR REPLACE FUNCTION recalculate_expert_score_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Call your Node.js API endpoint via pg_notify
  PERFORM pg_notify('expert_score_update', NEW.expert_id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on contract completion
CREATE TRIGGER trigger_recalc_score_on_contract
AFTER UPDATE ON contracts
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION recalculate_expert_score_trigger();
```

Then listen in Node.js:

```javascript
// In server.js
import { pool } from './config/db.js';
import { calculateExpertScore, saveScoresToDatabase } from './services/scoringService.js';

// Listen for score update notifications
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database for notifications', err);
    return;
  }
  
  client.query('LISTEN expert_score_update');
  
  client.on('notification', async (msg) => {
    const expertId = msg.payload;
    console.log(`Recalculating score for expert: ${expertId}`);
    
    try {
      const scores = await calculateExpertScore(expertId);
      await saveScoresToDatabase(expertId, scores.scores);
      console.log(`✅ Score updated for expert: ${expertId}`);
    } catch (error) {
      console.error(`❌ Failed to update score for expert: ${expertId}`, error);
    }
  });
});
```

## Method 2: Direct Integration (Child Process)

For simpler integration without microservice:

```javascript
import { spawn } from 'child_process';
import path from 'path';

export const calculateScoreDirectly = (expertData) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../scoring_service/scoring_algorithm.py');
    
    const python = spawn('python', [pythonScript]);
    
    // Send expert data via stdin
    python.stdin.write(JSON.stringify(expertData));
    python.stdin.end();
    
    let output = '';
    let errorOutput = '';
    
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${errorOutput}`));
      } else {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${e.message}`));
        }
      }
    });
  });
};
```

## Testing

### Test Python Service Standalone

```bash
cd "c:\Users\nachi\Downloads\Deeptech\Expert scoring dummy data"
python scoring_algorithm.py
```

### Test Flask API (if using Method 1)

```bash
cd "c:\Users\nachi\Downloads\Deeptech\deeptech_backend\scoring_service"
python server.py

# In another terminal:
curl http://localhost:8001/health
curl -X POST http://localhost:8001/api/scoring/calculate/91fdd410-f3f0-409b-b1b9-ee416a225828
```

### Test Node.js Integration

```javascript
// test_scoring.js
import { calculateExpertScore } from './services/scoringService.js';

const testScoring = async () => {
  const scores = await calculateExpertScore('91fdd410-f3f0-409b-b1b9-ee416a225828');
  console.log('Scores:', scores);
};

testScoring();
```

## Environment Variables

Add to `.env`:

```bash
# Scoring Service
SCORING_SERVICE_URL=http://localhost:8001
SCORING_SERVICE_TIMEOUT=30000
```

## Deployment Considerations

### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: ./deeptech_backend
    ports:
      - "5000:5000"
    depends_on:
      - db
      - scoring-service
      
  scoring-service:
    build: ./scoring_service
    ports:
      - "8001:8001"
    environment:
      DATABASE_URL: ${DATABASE_URL}
    depends_on:
      - db
      
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
```

## Performance Optimization

1. **Caching**: Cache scores for 1 hour
2. **Batch Processing**: Calculate scores in batches during off-peak hours
3. **Queue System**: Use Bull/BullMQ for async processing
4. **Database Indexes**: Index user_scores table properly

## Next Steps

1. ✅ Create database tables (`user_scores`, `user_rank_tiers`, `user_tags`)
2. ✅ Set up Python Flask service
3. ✅ Integrate with Node.js backend
4. ✅ Add database triggers
5. ✅ Test end-to-end
6. ✅ Deploy to production

## Support

For questions or issues:
- Check logs: `docker logs scoring-service`
- Test Python directly: `python scoring_algorithm.py`
- Verify database connection
- Check service health: `GET /health`
