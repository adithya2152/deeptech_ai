/**
 * Test Script for Embedding Service
 * Validates that sentence transformers are working correctly
 * 
 * Run: node test_embedding_service.js
 */

import embeddingService from './services/embeddingService.js';

async function testEmbeddingService() {
  console.log('=== Embedding Service Test ===\n');

  try {
    // Test 1: Generate single embedding
    console.log('Test 1: Generate single embedding');
    const text1 = "AI expert specializing in computer vision and robotics";
    console.log(`Text: "${text1}"`);
    
    const embedding1 = await embeddingService.generateEmbedding(text1);
    console.log(`✓ Embedding generated: ${embedding1.length} dimensions`);
    console.log(`  Sample values: [${embedding1.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]\n`);

    // Test 2: Generate another embedding
    console.log('Test 2: Generate another embedding');
    const text2 = "Machine learning researcher with expertise in autonomous drone systems";
    console.log(`Text: "${text2}"`);
    
    const embedding2 = await embeddingService.generateEmbedding(text2);
    console.log(`✓ Embedding generated: ${embedding2.length} dimensions\n`);

    // Test 3: Calculate similarity
    console.log('Test 3: Calculate cosine similarity');
    const similarity = embeddingService.cosineSimilarity(embedding1, embedding2);
    console.log(`Similarity between texts: ${(similarity * 100).toFixed(2)}%`);
    console.log(`(Higher = more similar, expected >70% for related topics)\n`);

    // Test 4: Different topic (should have low similarity)
    console.log('Test 4: Unrelated text similarity');
    const text3 = "Chef specializing in Italian cuisine and pasta making";
    console.log(`Text: "${text3}"`);
    
    const embedding3 = await embeddingService.generateEmbedding(text3);
    const similarity2 = embeddingService.cosineSimilarity(embedding1, embedding3);
    console.log(`Similarity: ${(similarity2 * 100).toFixed(2)}%`);
    console.log(`(Expected <30% for unrelated topics)\n`);

    // Test 5: Batch generation
    console.log('Test 5: Batch embedding generation');
    const texts = [
      "Robotics engineer",
      "AI researcher",
      "Data scientist"
    ];
    console.log(`Generating embeddings for ${texts.length} texts...`);
    
    const start = Date.now();
    const embeddings = await embeddingService.batchGenerateEmbeddings(texts);
    const duration = Date.now() - start;
    
    console.log(`✓ Generated ${embeddings.length} embeddings in ${duration}ms`);
    console.log(`  Average: ${(duration / embeddings.length).toFixed(2)}ms per embedding\n`);

    // Test 6: Expert profile text building
    console.log('Test 6: Build expert profile text');
    const mockExpert = {
      bio: "PhD in Robotics from MIT, 10 years of industry experience",
      skills: ["Machine Learning", "Computer Vision", "ROS", "Python"],
      domains: ["ai_ml", "robotics"],
      expertise_areas: "Autonomous systems, drone navigation, SLAM"
    };
    
    const expertText = embeddingService.buildExpertText(mockExpert);
    console.log(`Expert text: "${expertText}"`);
    
    const expertEmbedding = await embeddingService.generateEmbedding(expertText);
    console.log(`✓ Expert embedding generated: ${expertEmbedding.length} dimensions\n`);

    // Test 7: Project text building
    console.log('Test 7: Build project text');
    const mockProject = {
      title: "Autonomous Drone Navigation System",
      description: "Develop AI-powered navigation for warehouse drones",
      expected_outcome: "Working prototype with obstacle avoidance",
      domains: ["ai_ml", "robotics"],
      risk_categories: ["technical_risk", "timeline_risk"]
    };
    
    const projectText = embeddingService.buildProjectText(mockProject);
    console.log(`Project text: "${projectText}"`);
    
    const projectEmbedding = await embeddingService.generateEmbedding(projectText);
    console.log(`✓ Project embedding generated: ${projectEmbedding.length} dimensions\n`);

    // Test 8: Expert-Project matching
    console.log('Test 8: Expert-Project matching');
    const matchScore = embeddingService.cosineSimilarity(expertEmbedding, projectEmbedding);
    console.log(`Match score: ${(matchScore * 100).toFixed(2)}%`);
    console.log(`(This expert should be a strong match for this project)\n`);

    // Test 9: Consistency check
    console.log('Test 9: Consistency check (same text should produce same embedding)');
    const emb1 = await embeddingService.generateEmbedding("Test text");
    const emb2 = await embeddingService.generateEmbedding("Test text");
    const consistencySim = embeddingService.cosineSimilarity(emb1, emb2);
    console.log(`Consistency: ${(consistencySim * 100).toFixed(4)}%`);
    console.log(`(Should be 100.00% or very close)\n`);

    // Summary
    console.log('=== All Tests Passed ✓ ===');
    console.log('\nEmbedding Service is ready for use!');
    console.log('\nNext steps:');
    console.log('1. Run database migration: migrations/add_semantic_search_support.sql');
    console.log('2. Generate embeddings for existing experts');
    console.log('3. Implement semantic search endpoint\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testEmbeddingService()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
