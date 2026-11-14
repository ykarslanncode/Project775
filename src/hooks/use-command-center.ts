import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { logActivity } from '@/lib/activity';
import { todayISO, getWeekStart, calculateStreak } from '@/lib/date-utils';
import type {
  DailyCommitment,
  ActivityLog,
  Trade,
  LearningItem,
  LearningSession,
  BusinessExperiment,
  EnglishSession,
  DailyCheckin,
  UserSettings,
} from '@/types';

export function useCommandCenterData() {
  const { user, settings } = useAuth();
  const [commitments, setCommitments] = useState<DailyCommitment[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [learningItems, setLearningItems] = useState<LearningItem[]>([]);
  const [learningSessions, setLearningSessions] = useState<LearningSession[]>([]);
  const [experiments, setExperiments] = useState<BusinessExperiment[]>([]);
  const [englishSessions, setEnglishSessions] = useState<EnglishSession[]>([]);
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const today = todayISO();
    const weekStart = getWeekStart();

    const [
      commitmentsRes,
      activityRes,
      tradesRes,
      learningRes,
      learningSessionsRes,
      experimentsRes,
      englishRes,
      checkinsRes,
    ] = await Promise.all([
      supabase.from('daily_commitments').select('*').eq('user_id', user.id).eq('date', today).order('created_at'),
      supabase.from('activity_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('trades').select('*').eq('user_id', user.id).order('trade_date', { ascending: false }),
      supabase.from('learning_items').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('learning_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('business_experiments').select('*').eq('user_id', user.id).order('start_date', { ascending: false }),
      supabase.from('english_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('daily_checkins').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    ]);

    setCommitments((commitmentsRes.data as DailyCommitment[]) ?? []);
    setRecentActivity((activityRes.data as ActivityLog[]) ?? []);
    setTrades((tradesRes.data as Trade[]) ?? []);
    setLearningItems((learningRes.data as LearningItem[]) ?? []);
    setLearningSessions((learningSessionsRes.data as LearningSession[]) ?? []);
    setExperiments((experimentsRes.data as BusinessExperiment[]) ?? []);
    setEnglishSessions((englishRes.data as EnglishSession[]) ?? []);
    setCheckins((checkinsRes.data as DailyCheckin[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todayCommitments = commitments.filter((c) => c.date === todayISO());
  const completedCommitments = todayCommitments.filter((c) => c.completed);
  const dailyCompletionRate =
    todayCommitments.length > 0
      ? Math.round((completedCommitments.length / todayCommitments.length) * 100)
      : 0;

  const weekCommitments = commitments;
  const weeklyCompletionRate =
    weekCommitments.length > 0
      ? Math.round((weekCommitments.filter((c) => c.completed).length / weekCommitments.length) * 100)
      : 0;

  // Trading stats
  const winningTrades = trades.filter((t) => t.result > 0);
  const losingTrades = trades.filter((t) => t.result < 0);
  const winRate = trades.length > 0 ? Math.round((winningTrades.length / trades.length) * 100) : 0;
  const netR = trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0);
  const avgPlanAdherence =
    trades.length > 0
      ? Math.round(trades.reduce((sum, t) => sum + (t.plan_adherence || 0), 0) / trades.length)
      : 0;

  // Learning stats
  const completedLearning = learningItems.filter((i) => i.status === 'Completed');
  const inProgressLearning = learningItems.filter((i) => i.status === 'In Progress');
  const overallLearningProgress =
    learningItems.length > 0
      ? Math.round(learningItems.reduce((sum, i) => sum + i.progress, 0) / learningItems.length)
      : 0;
  const totalLearningMinutes = learningSessions.reduce((sum, s) => sum + s.duration_minutes, 0);

  // Business stats
  const activeExperiments = experiments.filter(
    (e) => e.validation_status === 'Testing' || e.validation_status === 'Idea'
  );
  const totalRevenue = experiments.reduce((sum, e) => sum + e.revenue, 0);
  const totalSpending = experiments.reduce((sum, e) => sum + e.actual_spending, 0);

  // English stats
  const weekStartStr = getWeekStart();
  const weeklyEnglishMinutes = englishSessions
    .filter((s) => s.date >= weekStartStr)
    .reduce((sum, s) => sum + s.duration_minutes, 0);
  const monthlyEnglishMinutes = englishSessions
    .filter((s) => {
      const d = new Date(s.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, s) => sum + s.duration_minutes, 0);

  // Streaks
  const checkinDates = checkins.map((c) => c.date);
  const englishDates = [...new Set(englishSessions.map((s) => s.date))];
  const learningDates = [...new Set(learningSessions.map((s) => s.date))];

  const checkinStreak = calculateStreak(checkinDates);
  const englishStreak = calculateStreak(englishDates);
  const learningStreak = calculateStreak(learningDates);

  return {
    loading,
    todayCommitments,
    completedCommitments,
    dailyCompletionRate,
    weeklyCompletionRate,
    trades,
    winningTrades,
    losingTrades,
    winRate,
    netR,
    avgPlanAdherence,
    completedLearning,
    inProgressLearning,
    overallLearningProgress,
    totalLearningMinutes,
    activeExperiments,
    totalRevenue,
    totalSpending,
    weeklyEnglishMinutes,
    monthlyEnglishMinutes,
    checkinStreak,
    englishStreak,
    learningStreak,
    recentActivity,
    settings: settings as UserSettings | null,
    reloadData: loadData,
  };
}

export async function addCommitment(userId: string, title: string, priority: string, category: string) {
  const { data, error } = await supabase
    .from('daily_commitments')
    .insert({
      user_id: userId,
      title,
      date: todayISO(),
      priority,
      category,
    })
    .select()
    .single();
  if (error) throw error;
  await logActivity(userId, 'Added commitment', 'command', title);
  return data;
}

export async function toggleCommitment(id: string, completed: boolean, userId: string) {
  const { error } = await supabase
    .from('daily_commitments')
    .update({ completed })
    .eq('id', id);
  if (error) throw error;
  if (completed) {
    await logActivity(userId, 'Completed commitment', 'command', '');
  }
}

export async function deleteCommitment(id: string) {
  const { error } = await supabase.from('daily_commitments').delete().eq('id', id);
  if (error) throw error;
}

export async function updateCommitment(id: string, updates: Partial<DailyCommitment>) {
  const { error } = await supabase.from('daily_commitments').update(updates).eq('id', id);
  if (error) throw error;
}
