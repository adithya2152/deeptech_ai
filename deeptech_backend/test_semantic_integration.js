/**
 * Test Semantic Search Integration
 * Tests the Node.js backend calling the Python semantic search service
 */

import fetch from 'node-fetch';

const PYTHON_SERVICE_URL = process.env.PYTHON_SEMANTIC_SEARCH_URL || 'http://127.0.0.1:8000';

async function testSemanticSearchIntegration() {
  console.log('🔗 Testing Node.js ↔ Python Semantic Search Integration');
  console.log('=' * 60);
  console.log(`Python service URL: ${PYTHON_SERVICE_URL}\n`);

  try {
    // Test 1: Health check
    console.log('Test 1: Python Service Health Check');
    console.log('-' * 40);
    try {
      const healthResponse = await fetch(`${PYTHON_SERVICE_URL}/health`, {
        timeout: 5000
      });

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ Python service is healthy');
        console.log(`   Status: ${healthData.status}`);
        console.log(`   Service: ${healthData.service}`);
      } else {
        console.log(`❌ Health check failed: ${healthResponse.status}`);
        return;
      }
    } catch (error) {
      console.log(`❌ Cannot connect to Python service: ${error.message}`);
      console.log('💡 Make sure the Python semantic search service is running on port 8000');
      return;
    }

    // Test 2: Semantic search
    console.log('\nTest 2: Semantic Search Query');
    console.log('-' * 40);

    const searchQuery = "machine learning expert with Python experience";
    console.log(`Query: "${searchQuery}"`);

    try {
      const searchResponse = await fetch(`${PYTHON_SERVICE_URL}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 3
        }),
        timeout: 10000
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        console.log('✅ Semantic search successful');
        console.log(`   Found ${searchData.results?.length || 0} results`);

        if (searchData.results && searchData.results.length > 0) {
          console.log('   Top results:');
          searchData.results.slice(0, 3).forEach((result, index) => {
            console.log(`     ${index + 1}. ${result.name} (similarity: ${result.similarity?.toFixed(3) || 'N/A'})`);
          });
        }
      } else {
        console.log(`❌ Search failed: ${searchResponse.status} - ${searchResponse.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Search request failed: ${error.message}`);
    }

    // Test 3: Batch embedding generation
    console.log('\nTest 3: Batch Embedding Generation');
    console.log('-' * 40);

    try {
      const batchResponse = await fetch(`${PYTHON_SERVICE_URL}/batch/embeddings`, {
        method: 'POST',
        timeout: 30000
      });

      if (batchResponse.ok) {
        const batchData = await batchResponse.json();
        console.log('✅ Batch embedding generation successful');
        console.log(`   Updated: ${batchData.updated || 0} experts`);
        console.log(`   Errors: ${batchData.errors || 0}`);
        console.log(`   Skipped: ${batchData.skipped || 0}`);
      } else {
        console.log(`❌ Batch embedding failed: ${batchResponse.status} - ${batchResponse.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Batch embedding request failed: ${error.message}`);
    }

    console.log('\n🎉 Integration test completed!');
    console.log('✅ Node.js backend can successfully communicate with Python semantic search service');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSemanticSearchIntegration();
}

export { testSemanticSearchIntegration };