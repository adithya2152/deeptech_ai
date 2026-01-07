# 🎯 Expert Scoring System - Production Ready

AI-powered expert scoring using **Sentence Transformers** for semantic skill matching.

## 🚀 Quick Start

```bash
# Install dependencies
pip install -r requirements_optimized.txt
python -m spacy download en_core_web_sm

# Run scoring
python scoring_algorithm_optimized.py
```

## 📁 Files

| File | Purpose |
|------|---------|
| `scoring_algorithm_optimized.py` | Production scoring system with AI |
| `expert_dummy_data.json` | Sample expert profiles (3 experts) |
| `scoring_results_optimized.json` | Latest scoring results |
| `requirements_optimized.txt` | Python dependencies |
| `INSTALLATION_GUIDE.md` | Detailed setup instructions |
| `INTEGRATION_GUIDE.md` | Backend integration guide |

## 🤖 AI Stack

- **Sentence Transformers**: all-MiniLM-L6-v2 (89% accuracy)
- **spaCy**: en_core_web_sm (entity recognition)
- **PyMuPDF**: PDF resume extraction
- **python-docx**: Word document support

## 📊 Sample Experts

1. **Nachiket Doddamani** - AI/ML Specialist (75.45/100)
2. **Sarah Chen** - Deep Learning Expert (76.75/100)
3. **Raj Patel** - Quantum Computing Researcher (69.89/100)

## 🎯 Scoring Components

| Component | Weight | Description |
|-----------|--------|-------------|
| Expertise | 23% | Skills, education, publications |
| Performance | 28% | Contract completion, on-time delivery |
| Reliability | 23% | Disputes, cancellations, response time |
| Quality | 14% | Ratings, reviews |
| Engagement | 5% | Platform activity |
| Resume | 7% | AI-analyzed resume quality

3. **Reliability Score (23% weight)**
   - Dispute rate (inverse)
   - Cancellation rate (inverse)
   - Response time
   - Profile consistency

4. **Quality Score (14% weight)**
   - Average rating
   - Review count
   - Positive feedback ratio

5. **Engagement Score (5% weight)**
   - Community contributions
   - Content created
   - Peer recognition

6. **Resume Score (7% weight)**
   - Skill verification from resume
   - Education level
   - Certifications mentioned
   - Resume quality

## Rank Tiers

| Level | Tier Name | Score Range |
|-------|-----------|-------------|
| 10 | DeepTech Pioneer 🏆 | 100 |
| 9 | Legendary 👑 | 98-99 |
| 8 | Industry Leader ⭐ | 93-97 |
| 7 | Master Practitioner 💎 | 86-92 |
| 6 | Senior Expert 🔷 | 76-85 |
| 5 | Verified Specialist ✅ | 66-75 |
| 4 | Established Expert 📊 | 51-65 |
| 3 | Competent Expert 📈 | 36-50 |
| 2 | Emerging Professional 🌱 | 21-35 |
| 1 | Newcomer 🆕 | 0-20 |

## Sample Tags

- 📈 Rising Expert
- ✅ Verified Specialist
- 🎯 Domain Master
- 🏅 Quality Champion
- ⚡ Reliable Performer
- 🤝 Community Helper
- 🛡️ Dispute-Free
- 💡 Patent Holder
- 📚 Published Author

## Customization

### Add New Expert Data

Edit `expert_dummy_data.json` and add your expert information:

```json
{
  "id": "uuid-here",
  "name": "Expert Name",
  "domains": ["ai_ml"],
  "years_experience": 5,
  "skills": ["Python", "TensorFlow"],
  "rating": 4.5,
  "total_contracts": 20,
  "completed_contracts": 18,
  "resume_text": "Your resume content here..."
}
```

### Adjust Scoring Weights

Modify the `WEIGHTS` dictionary in `ExpertScoringSystem` class:

```python
WEIGHTS = {
    'expertise': 0.23,
    'performance': 0.28,
    'reliability': 0.23,
    'quality': 0.14,
    'engagement': 0.05,
    'resume': 0.07
}
```

## Integration with DeepTech Backend

To integrate with your Node.js backend:

1. **Python Service**: Run as a separate microservice
2. **API Endpoint**: Create `/api/scoring/calculate/:expertId`
3. **Database Sync**: Pull expert data from PostgreSQL
4. **Automated Triggers**: Recalculate scores on events (contract completion, feedback, etc.)

Example integration:

```javascript
// Backend endpoint
app.post('/api/scoring/calculate/:expertId', async (req, res) => {
  const { expertId } = req.params;
  
  // Fetch expert data from DB
  const expertData = await fetchExpertData(expertId);
  
  // Call Python scoring service
  const scores = await callPythonScoringService(expertData);
  
  // Save to user_scores table
  await saveScores(expertId, scores);
  
  res.json(scores);
});
```

## Future Enhancements

- [ ] Machine Learning model for predictive scoring
- [ ] Natural Language Processing for resume analysis
- [ ] Anomaly detection for score manipulation
- [ ] Real-time WebSocket updates
- [ ] GraphQL API support
- [ ] Multi-language support
