-- Great Spring Solutions - Database Extensions
-- Run automatically on first database creation via docker-entrypoint-initdb.d

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for fuzzy text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable btree_gin for composite indexes
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Enable citext for case-insensitive text
CREATE EXTENSION IF NOT EXISTS "citext";