import expertModel from '../models/expertModel.js';

export const searchExperts = async (req, res) => {
  try {
    const { domain, query, rateMin, rateMax, onlyVerified } = req.query;

    const filters = {
      domain,
      queryText: query,
      rateMin: rateMin && !isNaN(rateMin) ? rateMin : null,
      rateMax: rateMax && !isNaN(rateMax) ? rateMax : null,
      onlyVerified
    };

    const experts = await expertModel.searchExperts(filters);
    res.status(200).json({ data: experts });
  } catch (error) {
    console.error("SEARCH ERROR:", error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const semanticSearch = async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Query is required and must be a non-empty string'
      });
    }

    // Call Python semantic search microservice
    const searchResults = await callSemanticSearchService(query, limit);

    res.status(200).json({
      results: searchResults.results,
      query: query,
      total: searchResults.results.length
    });

  } catch (error) {
    console.error("SEMANTIC SEARCH ERROR:", error);
    res.status(500).json({
      error: 'Semantic search service unavailable',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getExpertById = async (req, res) => {
  try {
    const { id } = req.params;
    const expert = await expertModel.getExpertById(id);

    if (!expert) return res.status(404).json({ error: 'Expert not found' });

    res.status(200).json({ data: expert });
  } catch (error) {
    console.error("GET ID ERROR:", error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Helper function to call Python semantic search service
async function callSemanticSearchService(query, limit) {
  const fetch = (await import('node-fetch')).default;
  const PYTHON_SERVICE_URL = process.env.PYTHON_SEMANTIC_SEARCH_URL || 'http://127.0.0.1:8000';

  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        limit: limit
      }),
      timeout: 30000 // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`Python service returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error calling Python semantic search service:', error);
    throw new Error('Semantic search service is currently unavailable');
  }
}

export default {
  searchExperts,
  semanticSearch,
  getExpertById
};