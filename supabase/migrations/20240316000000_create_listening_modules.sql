-- Migration to add listening_modules table
CREATE TABLE IF NOT EXISTS listening_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIMEZONE DEFAULT now()
);

-- Note: Ensure uuid-ossp extension is enabled in Supabase
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
