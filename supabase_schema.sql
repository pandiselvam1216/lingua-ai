-- FULL Supabase Schema for NeuraLingua Flask Backend
-- Create this in the Supabase SQL Editor

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(200),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Institutions Table (Optional but needed for models)
CREATE TABLE IF NOT EXISTS public.institutions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    role_id INTEGER REFERENCES public.roles(id) NOT NULL,
    institution_id INTEGER REFERENCES public.institutions(id),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Modules Table
CREATE TABLE IF NOT EXISTS public.modules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    "order" INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Listening Modules (Extra content)
CREATE TABLE IF NOT EXISTS public.listening_modules (
    id UUID PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    audio_url TEXT,
    tts_config TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Questions Table
CREATE TABLE IF NOT EXISTS public.questions (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES public.modules(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    title VARCHAR(200),
    content TEXT NOT NULL,
    media_url TEXT,
    passage_text TEXT,
    options JSONB,
    correct_answer TEXT,
    explanation TEXT,
    difficulty INTEGER DEFAULT 1,
    points INTEGER DEFAULT 10,
    time_limit INTEGER,
    tags JSONB,
    tts_config TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Attempts Table
CREATE TABLE IF NOT EXISTS public.attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES public.questions(id) ON DELETE CASCADE,
    user_answer TEXT,
    transcript TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_taken INTEGER,
    is_correct BOOLEAN,
    is_completed BOOLEAN DEFAULT FALSE
);

-- 8. Scores Table
CREATE TABLE IF NOT EXISTS public.scores (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER REFERENCES public.attempts(id) ON DELETE CASCADE UNIQUE,
    total_score FLOAT NOT NULL,
    max_score FLOAT DEFAULT 100,
    percentage FLOAT,
    breakdown JSONB,
    feedback TEXT,
    suggestions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --- SEED DATA ---

-- Seed Roles
INSERT INTO public.roles (id, name, description, permissions)
VALUES 
    (1, 'student', 'Student user', '{"access_modules": true}'),
    (2, 'teacher', 'Teacher user', '{"access_modules": true, "view_students": true, "manage_content": true}'),
    (3, 'admin', 'Administrator', '{"access_modules": true, "view_students": true, "manage_content": true, "manage_users": true}')
ON CONFLICT (id) DO NOTHING;

-- Seed Modules
INSERT INTO public.modules (id, name, slug, description, icon, color, "order")
VALUES 
    (1, 'Listening', 'listening', 'Audio comprehension exercises', 'headphones', '#6366F1', 1),
    (2, 'Speaking', 'speaking', 'Speech and pronunciation practice', 'mic', '#8B5CF6', 2),
    (3, 'Reading', 'reading', 'Reading comprehension passages', 'book-open', '#06B6D4', 3),
    (4, 'Writing', 'writing', 'Essay and composition writing', 'edit-3', '#10B981', 4),
    (5, 'Grammar', 'grammar', 'Grammar rules and exercises', 'check-square', '#F59E0B', 5),
    (6, 'Vocabulary', 'vocabulary', 'Word meanings and usage', 'book', '#EF4444', 6),
    (7, 'Critical Thinking', 'critical-thinking', 'JAM sessions and analytical skills', 'brain', '#EC4899', 7)
ON CONFLICT (id) DO NOTHING;

-- Seed Default Admin (Password: admin123)
INSERT INTO public.users (email, password_hash, full_name, role_id, is_active, is_verified)
VALUES (
    'admin@neuralingua.com', 
    '$2b$12$Gn9w5FiyG9DhdCPSt/T..OE3uHNSbSl/6PT9L.TrztV4ixml5xGdq', 
    'System Administrator', 
    3, 
    true, 
    true
)
ON CONFLICT (email) DO NOTHING;

-- Seed Default Student (Password: student123)
INSERT INTO public.users (email, password_hash, full_name, role_id, is_active, is_verified)
VALUES (
    'student@neuralingua.com', 
    '$2b$12$zGiwfLyIEdYSXpX8Lh3U0.Qv08euw4bqzG06MZG.5qzdUZv16fzDC', 
    'Sample Student', 
    1, 
    true, 
    true
)
ON CONFLICT (email) DO NOTHING;
