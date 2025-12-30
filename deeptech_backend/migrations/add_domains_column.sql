-- Add domains column to profiles table
-- This migration adds support for expert domain specializations

-- Add domains column as text array
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS domains text[];

-- Add index for faster domain searches
CREATE INDEX IF NOT EXISTS idx_profiles_domains 
ON profiles USING GIN (domains);

-- Add comment
COMMENT ON COLUMN profiles.domains IS 'Array of expertise domains for expert users (ai_ml, robotics, climate_tech, etc.)';

-- Verify the column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'domains'
  ) THEN
    RAISE NOTICE 'SUCCESS: domains column added to profiles table';
  ELSE
    RAISE EXCEPTION 'FAILED: domains column was not added';
  END IF;
END $$;
