-- Supabase Schema for NeuraLingua Flask Backend
-- Create this in the Supabase SQL Editor

-- 1. Create Modules Table
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

-- 2. Create Questions Table
CREATE TABLE IF NOT EXISTS public.questions (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES public.modules(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
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
    is_active BOOLEAN DEFAULT TRUE,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Seed Default Modules (matching seed_db.py logic)
INSERT INTO public.modules (id, name, slug, description, icon, color, "order")
VALUES 
    (1, 'Listening', 'listening', 'Audio comprehension exercises', 'headphones', '#6366F1', 1),
    (2, 'Speaking', 'speaking', 'Speech and pronunciation practice', 'mic', '#8B5CF6', 2),
    (3, 'Reading', 'reading', 'Reading comprehension passages', 'book-open', '#06B6D4', 3),
    (4, 'Writing', 'writing', 'Essay and composition writing', 'edit-3', '#10B981', 4),
    (5, 'Grammar', 'grammar', 'Grammar rules and exercises', 'check-square', '#F59E0B', 5),
    (6, 'Vocabulary', 'vocabulary', 'Word meanings and usage', 'book', '#EF4444', 6),
    (7, 'Critical Thinking', 'critical-thinking', 'JAM sessions and analytical skills', 'brain', '#EC4899', 7)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    "order" = EXCLUDED.order;

-- 4. Enable RLS (Optional but recommended)
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Allow public read on modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Allow public read on questions" ON public.questions FOR SELECT USING (true);

-- Allow authenticated users to manage data (Adjust as needed)
-- Note: Replace with your actual admin role or user_id check if you want more security
CREATE POLICY "Allow all on modules for authenticated" ON public.modules ALL TO authenticated USING (true);
CREATE POLICY "Allow all on questions for authenticated" ON public.questions ALL TO authenticated USING (true);
