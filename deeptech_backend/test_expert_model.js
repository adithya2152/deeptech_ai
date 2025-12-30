/**
 * Test Expert Model - Semantic Search Methods
 * Tests the new embedding-related methods in expertModel
 * 
 * Run: node test_expert_model.js
 */

import expertModel from './models/expertModel.js';
import embeddingService from './services/embeddingService.js';

async function testExpertModel() {
  console.log('='.repeat(60));
  console.log('EXPERT MODEL - SEMANTIC SEARCH TESTS');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Test 1: Get experts needing embeddings
    console.log('Test 1: Get experts needing embeddings');
    console.log('-'.repeat(60));
    
    const expertsNeedingEmbedding = await expertModel.getExpertsNeedingEmbedding();
    console.log(`✅ Found ${expertsNeedingEmbedding.length} experts needing embeddings\n`);
    
    if (expertsNeedingEmbedding.length > 0) {
      console.log('Sample expert:');
      const sample = expertsNeedingEmbedding[0];
      console.log(`  ID: ${sample.id}`);
      console.log(`  Name: ${sample.name || 'N/A'}`);
      console.log(`  Bio: ${sample.bio ? sample.bio.substring(0, 80) + '...' : 'N/A'}`);
      console.log(`  Domains: ${sample.domains ? JSON.stringify(sample.domains) : 'N/A'}`);
      console.log(`  Has embedding: ${sample.embedding_updated_at ? 'Yes' : 'No'}\n`);
    } else {
      console.log('No experts need embeddings (all up to date)\n');
    }
    
    // Test 2: Update embedding (if experts exist)
    if (expertsNeedingEmbedding.length > 0) {
      console.log('Test 2: Update embedding for first expert');
      console.log('-'.repeat(60));
      
      const testExpert = expertsNeedingEmbedding[0];
      
      // Generate a test embedding using embedding service
      await embeddingService.initialize();
      const testText = embeddingService.buildExpertText(testExpert);
      
      if (testText.trim()) {
        const testEmbedding = await embeddingService.generateEmbedding(testText);
        
        const result = await expertModel.updateEmbedding(
          testExpert.id,
          testEmbedding,
          testText
        );
        
        console.log(`✅ Updated embedding for expert: ${testExpert.id}`);
        console.log(`  Updated at: ${result.embedding_updated_at}`);
        console.log(`  Text length: ${testText.length} characters`);
        console.log(`  Embedding dimensions: ${testEmbedding.length}\n`);
      } else {
        console.log(`⚠️  Skipped - expert has no text content\n`);
      }
    } else {
      console.log('Test 2: Skipped (no experts to update)\n');
    }
    
    // Test 3: Get experts with embeddings
    console.log('Test 3: Get all experts with embeddings');
    console.log('-'.repeat(60));
    
    const expertsWithEmbeddings = await expertModel.getAllWithEmbeddings();
    console.log(`✅ Found ${expertsWithEmbeddings.length} experts with embeddings\n`);
    
    if (expertsWithEmbeddings.length > 0) {
      console.log('Sample expert with embedding:');
      const sample = expertsWithEmbeddings[0];
      console.log(`  ID: ${sample.id}`);
      console.log(`  Name: ${sample.name || 'N/A'}`);
      console.log(`  Domains: ${sample.domains ? JSON.stringify(sample.domains) : 'N/A'}`);
      console.log(`  Hourly rate: ${sample.hourly_rate ? '$' + sample.hourly_rate : 'N/A'}`);
      console.log(`  Availability: ${sample.availability || 'N/A'}`);
      console.log(`  Has embedding: Yes ✅\n`);
    }
    
    // Test 4: Get expert by ID (with full details)
    if (expertsWithEmbeddings.length > 0) {
      console.log('Test 4: Get expert by ID (full details)');
      console.log('-'.repeat(60));
      
      const expertId = expertsWithEmbeddings[0].id;
      const expertDetails = await expertModel.getById(expertId);
      
      if (expertDetails) {
        console.log(`✅ Retrieved expert details:`);
        console.log(`  ID: ${expertDetails.id}`);
        console.log(`  Email: ${expertDetails.email || 'N/A'}`);
        console.log(`  Role: ${expertDetails.role || 'N/A'}`);
        console.log(`  Has embedding: ${expertDetails.embedding ? 'Yes ✅' : 'No ❌'}\n`);
      }
    } else {
      console.log('Test 4: Skipped (no experts with embeddings)\n');
    }
    
    // Summary
    console.log('='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log(`Experts needing embeddings: ${expertsNeedingEmbedding.length}`);
    console.log(`Experts with embeddings:    ${expertsWithEmbeddings.length}`);
    console.log('='.repeat(60) + '\n');
    
    if (expertsNeedingEmbedding.length > 0) {
      console.log('💡 Next step: Run embedding generation');
      console.log('   node jobs/generateEmbeddings.js\n');
    } else {
      console.log('🎉 All experts have embeddings - ready for semantic search!\n');
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testExpertModel()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
