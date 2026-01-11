-- Migration: Create RPC function to get enum values
-- This function is used by the importer to validate enum fields before insertion
-- DO NOT EXECUTE automatically - run manually in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_enum_values(enum_name text)
RETURNS text[] AS $$
DECLARE
  enum_values text[];
BEGIN
  SELECT array_agg(enumlabel::text ORDER BY enumsortorder)
  INTO enum_values
  FROM pg_enum
  WHERE enumtypid = (
    SELECT oid
    FROM pg_type
    WHERE typname = enum_name
  );
  
  RETURN COALESCE(enum_values, ARRAY[]::text[]);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_enum_values(text) IS 'Returns array of valid values for a PostgreSQL enum type. Used by importer to validate enum fields.';













