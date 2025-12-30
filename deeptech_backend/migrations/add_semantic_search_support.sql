-- Add embedding support to experts table
-- Migration for semantic search implementation

-- Add vector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to experts table
ALTER TABLE experts 
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_text text,
ADD COLUMN IF NOT EXISTS embedding_updated_at timestamp with time zone;

-- Create index for fast similarity search (IVFFlat algorithm)
-- This significantly speeds up vector similarity queries
CREATE INDEX IF NOT EXISTS experts_embedding_idx 
ON experts 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Optional: Add embedding columns to projects table for caching
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_text text,
ADD COLUMN IF NOT EXISTS embedding_updated_at timestamp with time zone;

-- Create index for projects
CREATE INDEX IF NOT EXISTS projects_embedding_idx 
ON projects 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to mark embedding as stale when expert profile changes
CREATE OR REPLACE FUNCTION mark_expert_embedding_stale()
RETURNS TRIGGER AS $$
BEGIN
  -- If relevant fields changed, clear the embedding
  IF (OLD.bio IS DISTINCT FROM NEW.bio) OR
     (OLD.skills IS DISTINCT FROM NEW.skills) OR
     (OLD.domains IS DISTINCT FROM NEW.domains) OR
     (OLD.expertise_areas IS DISTINCT FROM NEW.expertise_areas) THEN
    NEW.embedding := NULL;
    NEW.embedding_text := NULL;
    NEW.embedding_updated_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically mark embeddings as stale
DROP TRIGGER IF EXISTS expert_profile_changed ON experts;
CREATE TRIGGER expert_profile_changed
  BEFORE UPDATE ON experts
  FOR EACH ROW
  EXECUTE FUNCTION mark_expert_embedding_stale();

-- Function to mark project embedding as stale when project changes
CREATE OR REPLACE FUNCTION mark_project_embedding_stale()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.title IS DISTINCT FROM NEW.title) OR
     (OLD.description IS DISTINCT FROM NEW.description) OR
     (OLD.expected_outcome IS DISTINCT FROM NEW.expected_outcome) OR
     (OLD.domains IS DISTINCT FROM NEW.domains) OR
     (OLD.risk_categories IS DISTINCT FROM NEW.risk_categories) THEN
    NEW.embedding := NULL;
    NEW.embedding_text := NULL;
    NEW.embedding_updated_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for projects
DROP TRIGGER IF EXISTS project_content_changed ON projects;
CREATE TRIGGER project_content_changed
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION mark_project_embedding_stale();

-- Add comments for documentation
COMMENT ON COLUMN experts.embedding IS 'Semantic embedding vector (384 dimensions) for similarity search';
COMMENT ON COLUMN experts.embedding_text IS 'The text that was embedded (for debugging and verification)';
COMMENT ON COLUMN experts.embedding_updated_at IS 'When the embedding was last generated';

COMMENT ON COLUMN projects.embedding IS 'Semantic embedding vector (384 dimensions) for similarity search';
COMMENT ON COLUMN projects.embedding_text IS 'The text that was embedded (for debugging and verification)';
COMMENT ON COLUMN projects.embedding_updated_at IS 'When the embedding was last generated';
