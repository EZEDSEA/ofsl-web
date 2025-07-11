/*
  # Remove additional_info column from leagues table (if it exists)

  1. Changes
    - Check if additional_info column exists before attempting to migrate data
    - Safely remove the column only if it exists
    - Preserve any existing data by merging into description field

  2. Safety
    - Uses conditional logic to avoid errors if column doesn't exist
    - Preserves all data before dropping column
*/

-- Check if the additional_info column exists and handle data migration
DO $$
BEGIN
  -- Check if the additional_info column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'additional_info'
  ) THEN
    -- First, merge additional_info into description for all leagues that have both fields populated
    UPDATE leagues
    SET description = description || E'\n\n' || additional_info
    WHERE description IS NOT NULL 
    AND additional_info IS NOT NULL
    AND description != ''
    AND additional_info != '';

    -- For leagues that have additional_info but no description, move additional_info to description
    UPDATE leagues
    SET description = additional_info
    WHERE (description IS NULL OR description = '')
    AND additional_info IS NOT NULL
    AND additional_info != '';

    -- Now that we've preserved all the data, drop the additional_info column
    ALTER TABLE leagues DROP COLUMN additional_info;
  END IF;
END $$;