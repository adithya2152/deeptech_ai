/**
 * Regenerate Embedding for Single Expert
 * Utility script to update embedding for a specific expert
 * 
 * Usage: node jobs/regenerateExpertEmbedding.js <expertId>
 */

import embeddingService from '../services/embeddingService.js';
import expertModel from '../models/expertModel.js';

async function regenerateExpertEmbedding(expertId) {
  console.log('🔄 Regenerating expert embedding...\n');
  console.log(`Expert ID: ${expertId}\n`);
  
  try {
    // 1. Initialize embedding service
    console.log('📦 Loading AI model...');
    await embeddingService.initialize();
    console.log('✅ Model loaded\n');
    
    // 2. Fetch expert from database
    console.log('🔍 Fetching expert data...');
    const expert = await expertModel.getById(expertId);
    
    if (!expert) {
      console.error(`❌ Expert not found with ID: ${expertId}`);
      console.error('Please check the expert ID and try again.\n');
      process.exit(1);
    }
    
    const expertName = `${expert.first_name || ''} ${expert.last_name || ''}`.trim() || 'Unknown';
    console.log(`✅ Found expert: ${expertName}\n`);
    
    // 3. Build text representation
    console.log('📝 Building text representation...');
    const expertText = embeddingService.buildExpertText({
      bio: expert.experience_summary,
      skills: expert.skills,
      domains: expert.domains,
      expertise_areas: expert.expertise_areas
    });
    
    if (!expertText.trim()) {
      console.error('❌ Expert has no text content to embed');
      console.error('Profile appears to be empty. Please add bio, skills, or domains.\n');
      process.exit(1);
    }
    
    console.log(`✅ Text length: ${expertText.length} characters`);
    console.log(`Preview: "${expertText.substring(0, 100)}..."\n`);
    
    // 4. Generate embedding
    console.log('🤖 Generating embedding...');
    const startTime = Date.now();
    const embedding = await embeddingService.generateEmbedding(expertText);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Embedding generated (${duration}ms)`);
    console.log(`   Dimensions: ${embedding.length}`);
    console.log(`   Sample values: [${embedding.slice(0, 3).map(v => v.toFixed(4)).join(', ')}...]\n`);
    
    // 5. Update database
    console.log('💾 Saving to database...');
    const result = await expertModel.updateEmbedding(expertId, embedding, expertText);
    
    console.log('✅ Database updated successfully\n');
    
    // 6. Summary
    console.log('='.repeat(60));
    console.log('🎉 EMBEDDING REGENERATION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`Expert ID:        ${expertId}`);
    console.log(`Expert Name:      ${expertName}`);
    console.log(`Updated At:       ${result.embedding_updated_at}`);
    console.log(`Embedding Size:   ${embedding.length} dimensions`);
    console.log(`Text Length:      ${expertText.length} characters`);
    console.log(`Processing Time:  ${duration}ms`);
    console.log('='.repeat(60) + '\n');
    
    console.log('✅ Expert is now ready for semantic search!\n');
    
    return result;
    
  } catch (error) {
    console.error('\n💥 ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Command line interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const expertId = process.argv[2];
  
  if (!expertId) {
    console.error('❌ Error: Expert ID is required\n');
    console.log('Usage:');
    console.log('  node jobs/regenerateExpertEmbedding.js <expertId>\n');
    console.log('Example:');
    console.log('  node jobs/regenerateExpertEmbedding.js 7f8c3a2e-1b4d-4c9a-8e2f-3d5a6b7c8d9e\n');
    process.exit(1);
  }
  
  regenerateExpertEmbedding(expertId)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default regenerateExpertEmbedding;
