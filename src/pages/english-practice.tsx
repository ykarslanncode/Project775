import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, Languages, Flame, Clock } from 'lucide-react';
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, getWeekStart, getLast7Days, calculateStreak, formatDuration } from '@/lib/date-utils';
import { toast } from 'sonner';
import type { EnglishSession, EnglishActivityType, UserSettings } from '@/types';

const ACTIVITIES: EnglishActivityType[] = ['Speaking', 'Listening', 'Reading', 'Writing', 'Vocabulary', 'Grammar'];
const PIE_COLORS: Record<string, string> = {
  Speaking: 'hsl(var(--chart-1))',
  Listening: 'hsl(var(--chart-2))',
  Reading: 'hsl(var(--chart-3))',
  Writing: 'hsl(var(--chart-4))',
  Vocabulary: 'hsl(var(--chart-5))',
  Grammar: 'hsl(var(--accent-english))',
};

const emptyForm: Omit<EnglishSession, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  activity_type: 'Speaking', date: new Date().toISOString().split('T')[0], duration_minutes: 30,
  topic: '', description: '', self_assessment: 5, notes: '',
};

export function EnglishPractice() {
  const { user, settings } = useAuth();
  const [sessions, setSessions] = useState<EnglishSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('english_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false });
    setSessions((data as EnglishSession[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const weeklyGoal = (settings as UserSettings | null)?.weekly_goal_minutes_english ?? 300;

  const stats = useMemo(() => {
    const weekStart = getWeekStart();
    const now = new Date();
    const weeklyMinutes = sessions.filter((s) => s.date >= weekStart).reduce((s, ses) => s + ses.duration_minutes, 0);
    const monthlyMinutes = sessions.filter((s) => { const d = new Date(s.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, ses) => s + ses.duration_minutes, 0);
    const dates = [...new Set(sessions.map((s) => s.date))];
    const streak = calculateStreak(dates);
    return { weeklyMinutes, monthlyMinutes, streak, weeklyGoalPct: Math.min(100, Math.round((weeklyMinutes / weeklyGoal) * 100)) };
  }, [sessions, weeklyGoal]);

  const distribution = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach((s) => { map[s.activity_type] = (map[s.activity_type] || 0) + s.duration_minutes; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [sessions]);

  const trendData = useMemo(() => {
    const days = getLast7Days();
    return days.map((d) => {
      const dayMin = sessions.filter((s) => s.date === d.date).reduce((sum, s) => sum + s.duration_minutes, 0);
      return { label: d.label, minutes: dayMin };
    });
  }, [sessions]);

  function openAdd() { setForm({ ...emptyForm, date: new Date().toISOString().split('T')[0] }); setEditId(null); setDialogOpen(true); }
  function openEdit(s: EnglishSession) {
    setForm({ activity_type: s.activity_type, date: s.date, duration_minutes: s.duration_minutes, topic: s.topic, description: s.description, self_assessment: s.self_assessment, notes: s.notes });
    setEditId(s.id); setDialogOpen(true);
  }

  async function handleSave() {
    if (!user) return;
    try {
      if (editId) {
        const { error } = await supabase.from('english_sessions').update(form).eq('id', editId);
        if (error) throw error;
        toast.success('Session updated');
      } else {
        const { error } = await supabase.from('english_sessions').insert({ ...form, user_id: user.id });
        if (error) throw error;
        await logActivity(user.id, 'Logged English practice', 'english', `${form.duration_minutes}m ${form.activity_type}`);
        toast.success('Session logged');
      }
      setDialogOpen(false); loadData();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to save'); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await supabase.from('english_sessions').delete().eq('id', deleteId); toast.success('Session deleted'); loadData(); }
    catch { toast.error('Failed to delete'); }
  }

  async function updateWeeklyGoal(minutes: number) {
    if (!user) return;
    try {
      const existing = await supabase.from('user_settings').select('id').eq('user_id', user.id).maybeSingle();
      if (existing.data) {
        await supabase.from('user_settings').update({ weekly_goal_minutes_english: minutes }).eq('user_id', user.id);
      } else {
        await supabase.from('user_settings').insert({ user_id: user.id, weekly_goal_minutes_english: minutes });
      }
      toast.success('Weekly goal updated');
    } catch { toast.error('Failed to update goal'); }
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="English Practice" description="Improve your English through consistent daily practice."
        action={<Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />Log Session</Button>} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'This Week', value: formatDuration(stats.weeklyMinutes) },
          { label: 'This Month', value: formatDuration(stats.monthlyMinutes) },
          { label: 'Weekly Goal', value: `${stats.weeklyGoalPct}%`, sub: `of ${formatDuration(weeklyGoal)}` },
          { label: 'Streak', value: `${stats.streak} days`, icon: stats.streak > 0 ? Flame : undefined, color: 'text-warning' },
        ].map((m) => (
          <Card key={m.label} className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
            <p className={`mt-1 font-display text-xl font-bold tabular-nums ${m.color ?? ''}`}>{m.value}</p>
            {m.sub && <p className="text-xs text-muted-foreground">{m.sub}</p>}
          </Card>
        ))}
      </div>

      {/* Weekly goal progress bar */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-[13px] font-semibold uppercase tracking-wider">Weekly Goal Progress</h3>
          <div className="flex items-center gap-2">
            <Input type="number" defaultValue={weeklyGoal} className="h-8 w-20 text-sm" onBlur={(e) => +e.target.value !== weeklyGoal && updateWeeklyGoal(+e.target.value)} />
            <span className="text-xs text-muted-foreground">min/week</span>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-english transition-all duration-500" style={{ width: `${stats.weeklyGoalPct}%` }} />
        </div>
      </Card>

      {sessions.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="font-display text-[13px] font-semibold uppercase tracking-wider mb-4">Activity Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}m`}>
                  {distribution.map((entry) => <Cell key={entry.name} fill={PIE_COLORS[entry.name] || 'hsl(var(--muted))'} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 4 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-5">
            <h3 className="font-display text-[13px] font-semibold uppercase tracking-wider mb-4">Practice Trend (7 days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 4 }} />
                <Line type="monotone" dataKey="minutes" stroke="hsl(var(--accent-english))" strokeWidth={2} dot={{ fill: 'hsl(var(--accent-english))' }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* History */}
      <div>
        <h3 className="font-display text-[13px] font-semibold uppercase tracking-wider mb-3">Practice History</h3>
        {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : sessions.length === 0 ? (
          <EmptyState icon={<Languages className="h-5 w-5" />} title="No practice sessions yet" description="Log your first English practice session to start tracking your progress." action={<Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />Log Session</Button>} />
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <Card key={s.id} className="p-4 transition-colors hover:border-foreground/20">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{s.activity_type}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(s.date)}</span>
                      {s.topic && <span className="text-xs text-muted-foreground">· {s.topic}</span>}
                    </div>
                    {s.description && <p className="mt-1 text-xs text-muted-foreground truncate">{s.description}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-display text-sm font-bold tabular-nums">{formatDuration(s.duration_minutes)}</p>
                    <p className="text-xs text-muted-foreground">Self: {s.self_assessment}/10</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-error" onClick={() => setDeleteId(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Edit Session' : 'Log English Session'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Activity Type</Label><Select value={form.activity_type} onValueChange={(v) => setForm({ ...form, activity_type: v as EnglishActivityType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ACTIVITIES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Duration (min)</Label><Input type="number" min="1" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: +e.target.value })} /></div>
              <div className="space-y-2"><Label>Self-Assessment (1-10)</Label><Input type="number" min="1" max="10" value={form.self_assessment} onChange={(e) => setForm({ ...form, self_assessment: +e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Topic</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="What did you practice?" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave}>{editId ? 'Update' : 'Log'} Session</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete session?" description="This practice session will be permanently deleted." confirmLabel="Delete" destructive onConfirm={handleDelete} />
    </div>
  );
}
