/**
 * Batch Embedding Generation Job
 * Generates semantic embeddings for all experts in the database
 * 
 * Run: node jobs/generateEmbeddings.js
 */

import embeddingService from '../services/embeddingService.js';
import expertModel from '../models/expertModel.js';

/**
 * Generate embeddings for all experts
 */
async function generateAllExpertEmbeddings() {
  console.log('🚀 Starting expert embedding generation...\n');
  
  try {
    // 1. Initialize embedding service (loads AI model)
    console.log('📦 Loading AI model...');
    await embeddingService.initialize();
    console.log('✅ Model loaded successfully\n');
    
    // 2. Fetch experts needing embeddings
    console.log('🔍 Fetching experts from database...');
    const experts = await expertModel.getExpertsNeedingEmbedding();
    console.log(`Found ${experts.length} experts to process\n`);
    
    if (experts.length === 0) {
      console.log('✨ All experts already have up-to-date embeddings!');
      console.log('Nothing to do. Exiting...\n');
      return {
        processed: 0,
        updated: 0,
        errors: 0,
        skipped: 0
      };
    }
    
    // 3. Process each expert
    let processed = 0;
    let updated = 0;
    let errors = 0;
    let skipped = 0;
    
    console.log('⚙️  Processing experts...\n');
    
    for (const expert of experts) {
      try {
        // Build text representation from expert profile
        const expertText = embeddingService.buildExpertText(expert);
        
        // Skip if no content
        if (!expertText.trim()) {
          console.log(`⚠️  Skipping expert ${expert.id} (${expert.name || 'Unknown'}) - no text content`);
          skipped++;
          processed++;
          continue;
        }
        
        // Generate embedding (384-dimensional vector)
        const embedding = await embeddingService.generateEmbedding(expertText);
        
        // Store in database
        await expertModel.updateEmbedding(expert.id, embedding, expertText);
        
        updated++;
        processed++;
        
        // Progress indicator (every 5 experts)
        if (processed % 5 === 0) {
          const percentage = ((processed / experts.length) * 100).toFixed(1);
          console.log(`📊 Progress: ${processed}/${experts.length} (${percentage}%) - ${updated} updated, ${errors} errors, ${skipped} skipped`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing expert ${expert.id} (${expert.name || 'Unknown'}):`, error.message);
        errors++;
        processed++;
      }
      
      // Small delay to avoid overwhelming the system
      if (processed % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // 4. Final summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ EMBEDDING GENERATION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`Total processed:       ${processed}`);
    console.log(`Successfully updated:  ${updated} ✅`);
    console.log(`Errors:                ${errors} ${errors > 0 ? '❌' : ''}`);
    console.log(`Skipped (no content):  ${skipped} ${skipped > 0 ? '⚠️' : ''}`);
    console.log('='.repeat(60) + '\n');
    
    if (updated > 0) {
      console.log('🎉 Experts are now ready for semantic search!\n');
    }
    
    return {
      processed,
      updated,
      errors,
      skipped
    };
    
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    console.error(error.stack);
    throw error;
  }
}

/**
 * Generate embedding for a single expert (by ID)
 */
async function generateSingleExpertEmbedding(expertId) {
  console.log(`🚀 Generating embedding for expert: ${expertId}\n`);
  
  try {
    await embeddingService.initialize();
    
    const expert = await expertModel.getById(expertId);
    if (!expert) {
      throw new Error(`Expert not found: ${expertId}`);
    }
    
    const expertText = embeddingService.buildExpertText(expert);
    if (!expertText.trim()) {
      throw new Error('Expert has no text content to embed');
    }
    
    const embedding = await embeddingService.generateEmbedding(expertText);
    const result = await expertModel.updateEmbedding(expertId, embedding, expertText);
    
    console.log(`✅ Successfully updated embedding`);
    console.log(`   Updated at: ${result.embedding_updated_at}`);
    console.log(`   Text length: ${expertText.length} characters\n`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run if called directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  const expertId = process.argv[2];
  
  if (expertId) {
    // Single expert mode
    generateSingleExpertEmbedding(expertId)
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  } else {
    // Batch mode (all experts)
    generateAllExpertEmbeddings()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  }
}

export { generateAllExpertEmbeddings, generateSingleExpertEmbedding };
export default generateAllExpertEmbeddings;
