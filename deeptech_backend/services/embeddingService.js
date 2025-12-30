/**
 * Embedding Service
 * Generates semantic embeddings for text using sentence transformers
 * Model: all-MiniLM-L6-v2 (384 dimensions, fast, good quality)
 */

import { pipeline } from '@xenova/transformers';

class EmbeddingService {
  constructor() {
    this.model = null;
    this.modelName = 'Xenova/all-MiniLM-L6-v2';
    this.isInitializing = false;
    this.initializationPromise = null;
  }

  /**
   * Initialize the embedding model
   * Downloads model on first run, then caches locally
   */
  async initialize() {
    if (this.model) {
      return this.model;
    }

    // Prevent multiple simultaneous initializations
    if (this.isInitializing) {
      return this.initializationPromise;
    }

    this.isInitializing = true;
    
    try {
      console.log(`[EmbeddingService] Loading model: ${this.modelName}...`);
      this.initializationPromise = pipeline('feature-extraction', this.modelName);
      this.model = await this.initializationPromise;
      console.log('[EmbeddingService] Model loaded successfully');
      return this.model;
    } catch (error) {
      console.error('[EmbeddingService] Failed to load model:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Preprocess text for embedding generation
   * @param {string} text - Raw text to preprocess
   * @returns {string} - Cleaned text
   */
  preprocessText(text) {
    if (!text) return '';
    
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .slice(0, 512); // Limit to 512 chars (model max)
  }

  /**
   * Generate embedding for a single text
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - Embedding vector (384 dimensions)
   */
  async generateEmbedding(text) {
    await this.initialize();

    const cleanText = this.preprocessText(text);
    if (!cleanText) {
      throw new Error('Cannot generate embedding for empty text');
    }

    try {
      const output = await this.model(cleanText, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert tensor to array
      const embedding = Array.from(output.data);
      
      return embedding;
    } catch (error) {
      console.error('[EmbeddingService] Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   * More efficient than calling generateEmbedding multiple times
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>} - Array of embedding vectors
   */
  async batchGenerateEmbeddings(texts) {
    await this.initialize();

    const cleanTexts = texts.map(t => this.preprocessText(t));
    
    try {
      const embeddings = await Promise.all(
        cleanTexts.map(text => this.generateEmbedding(text))
      );
      
      return embeddings;
    } catch (error) {
      console.error('[EmbeddingService] Error in batch generation:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   * @param {number[]} embedding1 - First embedding vector
   * @param {number[]} embedding2 - Second embedding vector
   * @returns {number} - Similarity score (0-1, higher is more similar)
   */
  cosineSimilarity(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have same dimensions');
    }

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      mag1 += embedding1[i] * embedding1[i];
      mag2 += embedding2[i] * embedding2[i];
    }

    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    
    if (magnitude === 0) return 0;
    
    return dotProduct / magnitude;
  }

  /**
   * Build text representation from expert profile
   * @param {object} expert - Expert object from database
   * @returns {string} - Combined text for embedding
   */
  buildExpertText(expert) {
    const parts = [];

    if (expert.bio) parts.push(expert.bio);
    
    if (expert.skills && Array.isArray(expert.skills)) {
      parts.push(expert.skills.join(' '));
    }
    
    if (expert.domains && Array.isArray(expert.domains)) {
      parts.push(expert.domains.join(' '));
    }

    if (expert.expertise_areas) {
      parts.push(expert.expertise_areas);
    }

    return parts.join('. ');
  }

  /**
   * Build text representation from project
   * @param {object} project - Project object from database
   * @returns {string} - Combined text for embedding
   */
  buildProjectText(project) {
    const parts = [];

    if (project.title) parts.push(project.title);
    if (project.description) parts.push(project.description);
    if (project.expected_outcome) parts.push(project.expected_outcome);
    
    if (project.domains && Array.isArray(project.domains)) {
      parts.push(project.domains.join(' '));
    }

    if (project.risk_categories && Array.isArray(project.risk_categories)) {
      parts.push(project.risk_categories.join(' '));
    }

    return parts.join('. ');
  }
}

// Export singleton instance
const embeddingService = new EmbeddingService();
export default embeddingService;
