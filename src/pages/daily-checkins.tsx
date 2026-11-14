import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, CheckSquare, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import { SectionHeader } from '@/components/ui/section-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, todayISO } from '@/lib/date-utils';
import { toast } from 'sonner';
import type { DailyCheckin } from '@/types';

const emptyForm = {
  date: todayISO(), mood: 5, energy_level: 5, focus_level: 5, sleep_quality: 5,
  main_priority: '', biggest_achievement: '', biggest_challenge: '', what_i_learned: '',
  improve_tomorrow: '', reflection: '',
};

const RATING_FIELDS: { key: keyof typeof emptyForm; label: string }[] = [
  { key: 'mood', label: 'Mood' },
  { key: 'energy_level', label: 'Energy' },
  { key: 'focus_level', label: 'Focus' },
  { key: 'sleep_quality', label: 'Sleep Quality' },
];

const TEXT_FIELDS: { key: keyof typeof emptyForm; label: string; placeholder: string }[] = [
  { key: 'main_priority', label: 'Main Priority', placeholder: "What's the one thing that matters most today?" },
  { key: 'biggest_achievement', label: 'Biggest Achievement', placeholder: 'What did you accomplish?' },
  { key: 'biggest_challenge', label: 'Biggest Challenge', placeholder: 'What was difficult?' },
  { key: 'what_i_learned', label: 'What I Learned', placeholder: 'Any lessons or insights?' },
  { key: 'improve_tomorrow', label: 'Improve Tomorrow', placeholder: 'What will you do better?' },
  { key: 'reflection', label: 'Daily Reflection', placeholder: 'General thoughts about today...' },
];

export function DailyCheckins() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('daily_checkins').select('*').eq('user_id', user.id).order('date', { ascending: false });
    setCheckins((data as DailyCheckin[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const todayCheckin = useMemo(() => checkins.find((c) => c.date === todayISO()), [checkins]);

  function openAdd() {
    if (todayCheckin) {
      openEdit(todayCheckin);
    } else {
      setForm({ ...emptyForm, date: todayISO() });
      setEditId(null);
      setDialogOpen(true);
    }
  }

  function openEdit(c: DailyCheckin) {
    setForm({ date: c.date, mood: c.mood, energy_level: c.energy_level, focus_level: c.focus_level, sleep_quality: c.sleep_quality, main_priority: c.main_priority, biggest_achievement: c.biggest_achievement, biggest_challenge: c.biggest_challenge, what_i_learned: c.what_i_learned, improve_tomorrow: c.improve_tomorrow, reflection: c.reflection });
    setEditId(c.id); setDialogOpen(true);
  }

  async function handleSave() {
    if (!user) return;
    try {
      if (editId) {
        const { error } = await supabase.from('daily_checkins').update(form).eq('id', editId);
        if (error) throw error;
        toast.success('Check-in updated');
      } else {
        const { error } = await supabase.from('daily_checkins').insert({ ...form, user_id: user.id });
        if (error) throw error;
        await logActivity(user.id, 'Completed daily check-in', 'checkin', form.date);
        toast.success('Check-in saved');
      }
      setDialogOpen(false); loadData();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to save check-in'); }
  }

  // Calendar grid
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const days: { date: string | null; hasCheckin: boolean; checkin?: DailyCheckin }[] = [];
    for (let i = 0; i < startPad; i++) days.push({ date: null, hasCheckin: false });
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = new Date(year, month, d).toISOString().split('T')[0];
      const checkin = checkins.find((c) => c.date === dateStr);
      days.push({ date: dateStr, hasCheckin: !!checkin, checkin });
    }
    return days;
  }, [calendarMonth, checkins]);

  return (
    <div className="space-y-5">
      <SectionHeader title="Daily Check-ins" description="Reflect on each day. One check-in per day, editable anytime."
        action={<Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />{todayCheckin ? 'Edit Today' : 'Check In'}</Button>} />

      {/* Today's status */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Today's Check-in</p>
            {todayCheckin ? (
              <p className="mt-1 font-display text-lg font-bold text-success">Completed</p>
            ) : (
              <p className="mt-1 font-display text-lg font-bold text-muted-foreground">Not yet</p>
            )}
          </div>
          <div className="flex gap-4">
            {todayCheckin && RATING_FIELDS.map((f) => (
              <div key={f.key} className="text-center">
                <p className="font-display text-xl font-bold tabular-nums">{todayCheckin[f.key as keyof DailyCheckin] as number}</p>
                <p className="text-xs text-muted-foreground">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="history">
        <TabsList><TabsTrigger value="history">History</TabsTrigger><TabsTrigger value="calendar">Calendar</TabsTrigger></TabsList>

        <TabsContent value="history" className="space-y-2">
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : checkins.length === 0 ? (
            <EmptyState icon={<CheckSquare className="h-5 w-5" />} title="No check-ins yet" description="Start your daily reflection habit today." action={<Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />Check In</Button>} />
          ) : checkins.map((c) => (
            <Card key={c.id} className="p-4 transition-colors hover:border-foreground/20">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{formatDate(c.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>M:{c.mood}</span><span>E:{c.energy_level}</span><span>F:{c.focus_level}</span><span>S:{c.sleep_quality}</span>
                    </div>
                  </div>
                  {c.main_priority && <p className="mt-1 text-sm text-muted-foreground truncate">Priority: {c.main_priority}</p>}
                  {c.biggest_achievement && <p className="text-xs text-muted-foreground truncate">Achievement: {c.biggest_achievement}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Edit2 className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>Previous</Button>
            <span className="font-display text-sm font-semibold">{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>Next</Button>
          </div>
          <Card className="p-4">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((d, i) => (
                <div key={i} className={`aspect-square rounded-sm flex items-center justify-center text-sm ${d.date === null ? '' : d.hasCheckin ? 'bg-success/10 text-success font-medium border border-success/20' : 'border border-border text-muted-foreground'}`}>
                  {d.date ? new Date(d.date + 'T00:00').getDate() : ''}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Check-in' : 'Daily Check-in'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} disabled={!!editId} /></div>
            <div className="grid grid-cols-4 gap-3">
              {RATING_FIELDS.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label className="text-xs">{f.label}</Label>
                  <Input type="number" min="1" max="10" value={form[f.key] as number} onChange={(e) => setForm({ ...form, [f.key]: +e.target.value })} className="text-center" />
                </div>
              ))}
            </div>
            {TEXT_FIELDS.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label>{f.label}</Label>
                <Textarea rows={2} value={form[f.key] as string} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} />
              </div>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave}>{editId ? 'Update' : 'Save'} Check-in</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
