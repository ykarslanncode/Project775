/*
# PROJECT 775 — Complete Database Schema

## Overview
Creates the full relational schema for PROJECT 775, a personal productivity and progress-tracking OS.
All tables are user-scoped with Row Level Security — each authenticated user can only access their own records.

## New Tables (13 total)
1. profiles — Extended user profile data
2. daily_commitments — Tasks committed for a specific day
3. daily_checkins — One-per-day reflection
4. trades — Trading journal entries
5. learning_items — CS/AI-ML learning topics
6. learning_sessions — Individual study sessions
7. business_experiments — Business idea validation tracker
8. english_sessions — English practice sessions
9. weekly_reviews — Guided weekly reflection
10. roadmap_phases — Two-year roadmap phases
11. roadmap_milestones — Milestones within roadmap phases
12. activity_logs — Chronological history of user actions
13. user_settings — User preferences

## Security
- RLS enabled on ALL tables, scoped to authenticated users
- Owner columns default to auth.uid()
- service_role granted for potential edge function use
*/

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text DEFAULT '',
  personal_goals text DEFAULT '',
  timezone text NOT NULL DEFAULT 'UTC',
  theme text NOT NULL DEFAULT 'dark',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated, service_role;
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- 2. DAILY_COMMITMENTS
CREATE TABLE IF NOT EXISTS daily_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  completed boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('trading','cs','ai','business','english','health','personal','general')),
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE daily_commitments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_commitments TO authenticated, service_role;
DROP POLICY IF EXISTS "select_own_commitments" ON daily_commitments;
CREATE POLICY "select_own_commitments" ON daily_commitments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_commitments" ON daily_commitments;
CREATE POLICY "insert_own_commitments" ON daily_commitments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_commitments" ON daily_commitments;
CREATE POLICY "update_own_commitments" ON daily_commitments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_commitments" ON daily_commitments;
CREATE POLICY "delete_own_commitments" ON daily_commitments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_commitments_user_id ON daily_commitments(user_id);
CREATE INDEX IF NOT EXISTS idx_commitments_date ON daily_commitments(date);

-- 3. DAILY_CHECKINS
CREATE TABLE IF NOT EXISTS daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  mood int NOT NULL DEFAULT 5 CHECK (mood BETWEEN 1 AND 10),
  energy_level int NOT NULL DEFAULT 5 CHECK (energy_level BETWEEN 1 AND 10),
  focus_level int NOT NULL DEFAULT 5 CHECK (focus_level BETWEEN 1 AND 10),
  sleep_quality int NOT NULL DEFAULT 5 CHECK (sleep_quality BETWEEN 1 AND 10),
  main_priority text DEFAULT '',
  biggest_achievement text DEFAULT '',
  biggest_challenge text DEFAULT '',
  what_i_learned text DEFAULT '',
  improve_tomorrow text DEFAULT '',
  reflection text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_checkins TO authenticated, service_role;
DROP POLICY IF EXISTS "select_own_checkins" ON daily_checkins;
CREATE POLICY "select_own_checkins" ON daily_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_checkins" ON daily_checkins;
CREATE POLICY "insert_own_checkins" ON daily_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_checkins" ON daily_checkins;
CREATE POLICY "update_own_checkins" ON daily_checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_checkins" ON daily_checkins;
CREATE POLICY "delete_own_checkins" ON daily_checkins FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON daily_checkins(date);

-- 4. TRADES
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_date date NOT NULL DEFAULT CURRENT_DATE,
  instrument text NOT NULL DEFAULT 'XAUUSD',
  session text DEFAULT '' CHECK (session IN ('','Asian','London','New York','Sydney','Other')),
  direction text NOT NULL DEFAULT 'buy' CHECK (direction IN ('buy','sell')),
  entry_price numeric(18,5),
  stop_loss numeric(18,5),
  take_profit numeric(18,5),
  exit_price numeric(18,5),
  risk_amount numeric(14,2) DEFAULT 0,
  result numeric(14,2) DEFAULT 0,
  r_multiple numeric(10,2) DEFAULT 0,
  strategy text DEFAULT '',
  setup_description text DEFAULT '',
  screenshot_url text DEFAULT '',
  emotional_state text DEFAULT '' CHECK (emotional_state IN ('','calm','confident','anxious','fearful','greedy','disciplined','impulsive','neutral')),
  plan_adherence int DEFAULT 0 CHECK (plan_adherence BETWEEN 0 AND 100),
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON trades TO authenticated, service_role;
DROP POLICY IF EXISTS "select_own_trades" ON trades;
CREATE POLICY "select_own_trades" ON trades FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_trades" ON trades;
CREATE POLICY "insert_own_trades" ON trades FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_trades" ON trades;
CREATE POLICY "update_own_trades" ON trades FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_trades" ON trades;
CREATE POLICY "delete_own_trades" ON trades FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(trade_date);
CREATE INDEX IF NOT EXISTS idx_trades_instrument ON trades(instrument);

-- 5. LEARNING_ITEMS
CREATE TABLE IF NOT EXISTS learning_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  category text NOT NULL DEFAULT 'Programming' CHECK (category IN (
    'Programming','Data Structures and Algorithms','Software Development',
    'Web Development','App Development','Artificial Intelligence',
    'Machine Learning','Data Science','Cybersecurity',
    'Operating Systems and Systems','Cloud and DevOps',
    'Graphics and Game Development','Portfolio Projects'
  )),
  description text DEFAULT '',
  start_date date,
  target_date date,
  completion_date date,
  status text NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started','In Progress','Completed','On Hold')),
  progress int NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  difficulty text DEFAULT 'beginner' CHECK (difficulty IN ('beginner','intermediate','advanced','expert')),
  resources text DEFAULT '',
  notes text DEFAULT '',
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE learning_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON learning_items TO authenticated, service_role;
DROP POLICY IF EXISTS "select_own_learning_items" ON learning_items;
CREATE POLICY "select_own_learning_items" ON learning_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_learning_items" ON learning_items;
CREATE POLICY "insert_own_learning_items" ON learning_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_learning_items" ON learning_items;
CREATE POLICY "update_own_learning_items" ON learning_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_learning_items" ON learning_items;
CREATE POLICY "delete_own_learning_items" ON learning_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_learning_user_id ON learning_items(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_category ON learning_items(category);
CREATE INDEX IF NOT EXISTS idx_learning_status ON learning_items(status);

-- 6. LEARNING_SESSIONS
CREATE TABLE IF NOT EXISTS learning_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  learning_item_id uuid REFERENCES learning_items(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes int NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
  topic text NOT NULL DEFAULT '',
  category text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON learning_sessions TO authenticated, service_role;
DROP POLICY IF EXISTS "select_own_learning_sessions" ON learning_sessions;
CREATE POLICY "select_own_learning_sessions" ON learning_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_learning_sessions" ON learning_sessions;
CREATE POLICY "insert_own_learning_sessions" ON learning_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_learning_sessions" ON learning_sessions;
CREATE POLICY "update_own_learning_sessions" ON learning_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_learning_sessions" ON learning_sessions;
CREATE POLICY "delete_own_learning_sessions" ON learning_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_id ON learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_date ON learning_sessions(date);

-- 7. BUSINESS_EXPERIMENTS
CREATE TABLE IF NOT EXISTS business_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_name text NOT NULL,
  description text DEFAULT '',
  problem text DEFAULT '',
  target_audience text DEFAULT '',
  proposed_solution text DEFAULT '',
  estimated_budget numeric(14,2) NOT NULL DEFAULT 0,
  actual_spending numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  validation_status text NOT NULL DEFAULT 'Idea' CHECK (validation_status IN ('Idea','Testing','Validated','Failed','Paused')),
  customer_feedback text DEFAULT '',
  people_interviewed int NOT NULL DEFAULT 0,
  interested_customers int NOT NULL DEFAULT 0,
  revenue numeric(14,2) NOT NULL DEFAULT 0,
  lessons_learned text DEFAULT '',
  next_steps text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE business_experiments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON business_experiments TO authenticated, service_role;
DROP POLICY IF EXISTS "select_own_experiments" ON business_experiments;
CREATE POLICY "select_own_experiments" ON business_experiments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_experiments" ON business_experiments;
CREATE POLICY "insert_own_experiments" ON business_experiments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_experiments" ON business_experiments;
CREATE POLICY "update_own_experiments" ON business_experiments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_experiments" ON business_experiments;
CREATE POLICY "delete_own_experiments" ON business_experiments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_experiments_user_id ON business_experiments(user_id);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON business_experiments(validation_status);

-- 8. ENGLISH_SESSIONS
CREATE TABLE IF NOT EXISTS english_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'Speaking' CHECK (activity_type IN ('Speaking','Listening','Reading','Writing','Vocabulary','Grammar')),
  date date NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes int NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
  topic text DEFAULT '',
  description text DEFAULT '',
  self_assessment int NOT NULL DEFAULT 5 CHECK (self_assessment BETWEEN 1 AND 10),
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE english_sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON english_sessions TO authenticated, service_role;
DROP POLICY IF EXISTS "select_own_english_sessions" ON english_sessions;
CREATE POLICY "select_own_english_sessions" ON english_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_english_sessions" ON english_sessions;
CREATE POLICY "insert_own_english_sessions" ON english_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_english_sessions" ON english_sessions;
CREATE POLICY "update_own_english_sessions" ON english_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_english_sessions" ON english_sessions;
CREATE POLICY "delete_own_english_sessions" ON english_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_english_user_id ON english_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_english_date ON english_sessions(date);
CREATE INDEX IF NOT EXISTS idx_english_activity ON english_sessions(activity_type);

-- 9. WEEKLY_REVIEWS
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  week_starting date NOT NULL DEFAULT CURRENT_DATE,
  main_achievements text DEFAULT '',
  completed_goals text DEFAULT '',
  incomplete_goals text DEFAULT '',
  biggest_lessons text DEFAULT '',
  biggest_mistakes text DEFAULT '',
  trading_review text DEFAULT '',
  learning_review text DEFAULT '',
  business_review text DEFAULT '',
  english_review text DEFAULT '',
  what_went_well text DEFAULT '',
  what_went_badly text DEFAULT '',
  what_to_change text DEFAULT '',
  next_week_objective text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON weekly_reviews TO authenticated, service_role;
DROP POLICY IF EXISTS "select_own_reviews" ON weekly_reviews;
CREATE POLICY "select_own_reviews" ON weekly_reviews FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_reviews" ON weekly_reviews;
CREATE POLICY "insert_own_reviews" ON weekly_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_reviews" ON weekly_reviews;
CREATE POLICY "update_own_reviews" ON weekly_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_reviews" ON weekly_reviews;
CREATE POLICY "delete_own_reviews" ON weekly_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON weekly_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_week ON weekly_reviews(week_starting);

-- 10. ROADMAP_PHASES
CREATE TABLE IF NOT EXISTS roadmap_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  target_date date,
  status text NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started','In Progress','Completed','On Hold')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE roadmap_phases ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON roadmap_phases TO authenticated, service_role;
DROP POLICY IF EXISTS "select_own_phases" ON roadmap_phases;
CREATE POLICY "select_own_phases" ON roadmap_phases FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_phases" ON roadmap_phases;
CREATE POLICY "insert_own_phases" ON roadmap_phases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_phases" ON roadmap_phases;
CREATE POLICY "update_own_phases" ON roadmap_phases FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_phases" ON roadmap_phases;
CREATE POLICY "delete_own_phases" ON roadmap_phases FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_phases_user_id ON roadmap_phases(user_id);

-- 11. ROADMAP_MILESTONES
CREATE TABLE IF NOT EXISTS roadmap_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES roadmap_phases(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'General' CHECK (category IN ('Trading','Computer Science','AI/ML','Business','English','Personal','Career','General')),
  description text DEFAULT '',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  target_date date,
  status text NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started','In Progress','Completed','On Hold')),
  progress int NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  notes text DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE roadmap_milestones ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON roadmap_milestones TO authenticated, service_role;
DROP POLICY IF EXISTS "select_own_milestones" ON roadmap_milestones;
CREATE POLICY "select_own_milestones" ON roadmap_milestones FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_milestones" ON roadmap_milestones;
CREATE POLICY "insert_own_milestones" ON roadmap_milestones FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_milestones" ON roadmap_milestones;
CREATE POLICY "update_own_milestones" ON roadmap_milestones FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_milestones" ON roadmap_milestones;
CREATE POLICY "delete_own_milestones" ON roadmap_milestones FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON roadmap_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_phase_id ON roadmap_milestones(phase_id);

-- 12. ACTIVITY_LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  section text NOT NULL DEFAULT 'general' CHECK (section IN ('command','trading','learning','business','english','checkin','review','roadmap','settings','general')),
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON activity_logs TO authenticated, service_role;
DROP POLICY IF EXISTS "select_own_activity" ON activity_logs;
CREATE POLICY "select_own_activity" ON activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_activity" ON activity_logs;
CREATE POLICY "insert_own_activity" ON activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_activity" ON activity_logs;
CREATE POLICY "update_own_activity" ON activity_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_activity" ON activity_logs;
CREATE POLICY "delete_own_activity" ON activity_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);

-- 13. USER_SETTINGS
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_goal_commitments int NOT NULL DEFAULT 5,
  weekly_goal_minutes_english int NOT NULL DEFAULT 300,
  weekly_goal_minutes_learning int NOT NULL DEFAULT 600,
  weekly_goal_text text DEFAULT '',
  dashboard_layout jsonb DEFAULT '{}'::jsonb,
  theme text NOT NULL DEFAULT 'dark',
  notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_settings TO authenticated, service_role;
DROP POLICY IF EXISTS "select_own_settings" ON user_settings;
CREATE POLICY "select_own_settings" ON user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_settings" ON user_settings;
CREATE POLICY "insert_own_settings" ON user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_settings" ON user_settings;
CREATE POLICY "update_own_settings" ON user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_settings" ON user_settings;
CREATE POLICY "delete_own_settings" ON user_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON user_settings(user_id);

-- Updated_at trigger function (reusable)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
  tables_with_updated text[] := ARRAY[
    'profiles','daily_commitments','daily_checkins','trades',
    'learning_items','business_experiments','english_sessions',
    'weekly_reviews','roadmap_phases','roadmap_milestones','user_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables_with_updated LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
  END LOOP;
END $$;
