export type Priority = 'low' | 'medium' | 'high';
export type CommitmentCategory = 'trading' | 'cs' | 'ai' | 'business' | 'english' | 'health' | 'personal' | 'general';
export type LearningStatus = 'Not Started' | 'In Progress' | 'Completed' | 'On Hold';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type LearningCategory =
  | 'Programming'
  | 'Data Structures and Algorithms'
  | 'Software Development'
  | 'Web Development'
  | 'App Development'
  | 'Artificial Intelligence'
  | 'Machine Learning'
  | 'Data Science'
  | 'Cybersecurity'
  | 'Operating Systems and Systems'
  | 'Cloud and DevOps'
  | 'Graphics and Game Development'
  | 'Portfolio Projects';

export type TradeDirection = 'buy' | 'sell';
export type TradingSession = '' | 'Asian' | 'London' | 'New York' | 'Sydney' | 'Other';
export type EmotionalState = '' | 'calm' | 'confident' | 'anxious' | 'fearful' | 'greedy' | 'disciplined' | 'impulsive' | 'neutral';

export type ValidationStatus = 'Idea' | 'Testing' | 'Validated' | 'Failed' | 'Paused';

export type EnglishActivityType = 'Speaking' | 'Listening' | 'Reading' | 'Writing' | 'Vocabulary' | 'Grammar';

export type RoadmapStatus = 'Not Started' | 'In Progress' | 'Completed' | 'On Hold';
export type RoadmapCategory = 'Trading' | 'Computer Science' | 'AI/ML' | 'Business' | 'English' | 'Personal' | 'Career' | 'General';

export type ActivitySection = 'command' | 'trading' | 'learning' | 'business' | 'english' | 'checkin' | 'review' | 'roadmap' | 'settings' | 'general';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string;
  personal_goals: string;
  timezone: string;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface DailyCommitment {
  id: string;
  user_id: string;
  title: string;
  date: string;
  completed: boolean;
  priority: Priority;
  category: CommitmentCategory;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  date: string;
  mood: number;
  energy_level: number;
  focus_level: number;
  sleep_quality: number;
  main_priority: string;
  biggest_achievement: string;
  biggest_challenge: string;
  what_i_learned: string;
  improve_tomorrow: string;
  reflection: string;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
  trade_date: string;
  instrument: string;
  session: TradingSession;
  direction: TradeDirection;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  exit_price: number | null;
  risk_amount: number;
  result: number;
  r_multiple: number;
  strategy: string;
  setup_description: string;
  screenshot_url: string;
  emotional_state: EmotionalState;
  plan_adherence: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface LearningItem {
  id: string;
  user_id: string;
  topic: string;
  category: LearningCategory;
  description: string;
  start_date: string | null;
  target_date: string | null;
  completion_date: string | null;
  status: LearningStatus;
  progress: number;
  difficulty: Difficulty;
  resources: string;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LearningSession {
  id: string;
  user_id: string;
  learning_item_id: string | null;
  date: string;
  duration_minutes: number;
  topic: string;
  category: string;
  notes: string;
  created_at: string;
}

export interface BusinessExperiment {
  id: string;
  user_id: string;
  idea_name: string;
  description: string;
  problem: string;
  target_audience: string;
  proposed_solution: string;
  estimated_budget: number;
  actual_spending: number;
  currency: string;
  start_date: string;
  end_date: string | null;
  validation_status: ValidationStatus;
  customer_feedback: string;
  people_interviewed: number;
  interested_customers: number;
  revenue: number;
  lessons_learned: string;
  next_steps: string;
  created_at: string;
  updated_at: string;
}

export interface EnglishSession {
  id: string;
  user_id: string;
  activity_type: EnglishActivityType;
  date: string;
  duration_minutes: number;
  topic: string;
  description: string;
  self_assessment: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReview {
  id: string;
  user_id: string;
  week_starting: string;
  main_achievements: string;
  completed_goals: string;
  incomplete_goals: string;
  biggest_lessons: string;
  biggest_mistakes: string;
  trading_review: string;
  learning_review: string;
  business_review: string;
  english_review: string;
  what_went_well: string;
  what_went_badly: string;
  what_to_change: string;
  next_week_objective: string;
  created_at: string;
  updated_at: string;
}

export interface RoadmapPhase {
  id: string;
  user_id: string;
  title: string;
  description: string;
  start_date: string;
  target_date: string | null;
  status: RoadmapStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RoadmapMilestone {
  id: string;
  user_id: string;
  phase_id: string | null;
  title: string;
  category: RoadmapCategory;
  description: string;
  start_date: string;
  target_date: string | null;
  status: RoadmapStatus;
  progress: number;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  section: ActivitySection;
  description: string;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  daily_goal_commitments: number;
  weekly_goal_minutes_english: number;
  weekly_goal_minutes_learning: number;
  weekly_goal_text: string;
  dashboard_layout: Record<string, unknown>;
  theme: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}
