import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import { SectionHeader } from '@/components/ui/section-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { UserSettings } from '@/types';

const TIMEZONES = ['UTC', 'Asia/Karachi', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Tokyo', 'Asia/Kolkata', 'Australia/Sydney'];

export function SettingsPage() {
  const { user, profile, settings, refreshProfile, refreshSettings } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [personalGoals, setPersonalGoals] = useState(profile?.personal_goals ?? '');
  const [timezone, setTimezone] = useState(profile?.timezone ?? 'UTC');
  const [theme, setTheme] = useState(profile?.theme ?? 'dark');
  const [dailyGoal, setDailyGoal] = useState(settings?.daily_goal_commitments ?? 5);
  const [weeklyEnglishGoal, setWeeklyEnglishGoal] = useState(settings?.weekly_goal_minutes_english ?? 300);
  const [weeklyLearningGoal, setWeeklyLearningGoal] = useState(settings?.weekly_goal_minutes_learning ?? 600);
  const [weeklyGoalText, setWeeklyGoalText] = useState(settings?.weekly_goal_text ?? '');
  const [notifications, setNotifications] = useState(settings?.notifications_enabled ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) { setDisplayName(profile.display_name); setAvatarUrl(profile.avatar_url); setPersonalGoals(profile.personal_goals); setTimezone(profile.timezone); setTheme(profile.theme); }
  }, [profile]);
  useEffect(() => {
    if (settings) { setDailyGoal(settings.daily_goal_commitments); setWeeklyEnglishGoal(settings.weekly_goal_minutes_english); setWeeklyLearningGoal(settings.weekly_goal_minutes_learning); setWeeklyGoalText(settings.weekly_goal_text); setNotifications(settings.notifications_enabled); }
  }, [settings]);

  async function handleSaveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      const existing = await supabase.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
      if (existing.data) {
        const { error } = await supabase.from('profiles').update({ display_name: displayName, avatar_url: avatarUrl, personal_goals: personalGoals, timezone, theme }).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('profiles').insert({ user_id: user.id, display_name: displayName, avatar_url: avatarUrl, personal_goals: personalGoals, timezone, theme });
        if (error) throw error;
      }
      await refreshProfile();
      toast.success('Profile saved');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to save profile'); }
    finally { setSaving(false); }
  }

  async function handleSaveSettings() {
    if (!user) return;
    setSaving(true);
    try {
      const existing = await supabase.from('user_settings').select('id').eq('user_id', user.id).maybeSingle();
      if (existing.data) {
        const { error } = await supabase.from('user_settings').update({ daily_goal_commitments: dailyGoal, weekly_goal_minutes_english: weeklyEnglishGoal, weekly_goal_minutes_learning: weeklyLearningGoal, weekly_goal_text: weeklyGoalText, notifications_enabled: notifications }).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_settings').insert({ user_id: user.id, daily_goal_commitments: dailyGoal, weekly_goal_minutes_english: weeklyEnglishGoal, weekly_goal_minutes_learning: weeklyLearningGoal, weekly_goal_text: weeklyGoalText, notifications_enabled: notifications });
        if (error) throw error;
      }
      await refreshSettings();
      await logActivity(user.id, 'Updated settings', 'settings', '');
      toast.success('Settings saved');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to save settings'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" description="Configure your profile, goals, and preferences." />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile */}
        <Card className="border-border bg-card p-6">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider mb-4">Profile</h3>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Display Name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Profile Image URL</Label><Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." /></div>
            <div className="space-y-2"><Label>Account Email</Label><Input value={user?.email ?? ''} disabled className="text-muted-foreground" /></div>
            <div className="space-y-2"><Label>Personal Goals</Label><Textarea rows={3} value={personalGoals} onChange={(e) => setPersonalGoals(e.target.value)} placeholder="What are you working toward over the next two years?" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Timezone</Label><Select value={timezone} onValueChange={setTimezone}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Theme</Label><Select value={theme} onValueChange={setTheme}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dark">Dark</SelectItem><SelectItem value="light">Light</SelectItem></SelectContent></Select></div>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>Save Profile</Button>
          </div>
        </Card>

        {/* Goals & Preferences */}
        <Card className="border-border bg-card p-6">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider mb-4">Goals & Preferences</h3>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Daily Goal — Commitments</Label><Input type="number" min="1" value={dailyGoal} onChange={(e) => setDailyGoal(+e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Weekly English (min)</Label><Input type="number" min="0" value={weeklyEnglishGoal} onChange={(e) => setWeeklyEnglishGoal(+e.target.value)} /></div>
              <div className="space-y-2"><Label>Weekly Learning (min)</Label><Input type="number" min="0" value={weeklyLearningGoal} onChange={(e) => setWeeklyLearningGoal(+e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Weekly Goal Text</Label><Textarea rows={2} value={weeklyGoalText} onChange={(e) => setWeeklyGoalText(e.target.value)} placeholder="Your main focus for this week" /></div>
            <div className="flex items-center justify-between">
              <Label>Notifications</Label>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <Button onClick={handleSaveSettings} disabled={saving}>Save Settings</Button>
          </div>
        </Card>
      </div>

      {/* Account Info */}
      <Card className="border-border bg-card p-6">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider mb-4">Account</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Email</span><span>{user?.email}</span></div>
          <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">User ID</span><span className="font-mono text-xs">{user?.id}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Member Since</span><span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span></div>
        </div>
      </Card>
    </div>
  );
}
