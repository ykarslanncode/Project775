import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, BookOpen, Clock, Layers, Sparkles } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatDuration } from '@/lib/date-utils';
import { toast } from 'sonner';
import type { LearningItem, LearningSession, LearningCategory, LearningStatus, Difficulty } from '@/types';

const CATEGORIES: LearningCategory[] = [
  'Programming', 'Data Structures and Algorithms', 'Software Development',
  'Web Development', 'App Development', 'Artificial Intelligence',
  'Machine Learning', 'Data Science', 'Cybersecurity',
  'Operating Systems and Systems', 'Cloud and DevOps',
  'Graphics and Game Development', 'Portfolio Projects',
];
const STATUSES: LearningStatus[] = ['Not Started', 'In Progress', 'Completed', 'On Hold'];
const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced', 'expert'];

const ROADMAP_TEMPLATES: { category: LearningCategory; items: string[] }[] = [
  { category: 'Programming', items: ['C Fundamentals', 'Python Basics', 'JavaScript Essentials', 'Java OOP'] },
  { category: 'Data Structures and Algorithms', items: ['Arrays & Strings', 'Linked Lists', 'Trees & Graphs', 'Dynamic Programming', 'Sorting Algorithms'] },
  { category: 'Web Development', items: ['HTML & CSS', 'React Fundamentals', 'Node.js Backend', 'REST APIs', 'Database Design'] },
  { category: 'Machine Learning', items: ['Linear Algebra', 'Statistics', 'Supervised Learning', 'Neural Networks', 'Model Deployment'] },
  { category: 'Cybersecurity', items: ['Network Security', 'Web Security', 'Cryptography Basics', 'Penetration Testing'] },
];

const STATUS_COLORS: Record<string, string> = {
  'Not Started': 'text-muted-foreground',
  'In Progress': 'text-cs',
  'Completed': 'text-success',
  'On Hold': 'text-warning',
};

const emptyItem: Omit<LearningItem, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  topic: '', category: 'Programming', description: '', start_date: null,
  target_date: null, completion_date: null, status: 'Not Started', progress: 0,
  difficulty: 'beginner', resources: '', notes: '', sort_order: 0,
};

export function LearningTracker() {
  const { user } = useAuth();
  const [items, setItems] = useState<LearningItem[]>([]);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyItem);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({ date: new Date().toISOString().split('T')[0], duration_minutes: 30, topic: '', notes: '', learning_item_id: '' as string });
  const [templateOpen, setTemplateOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [itemsRes, sessionsRes] = await Promise.all([
      supabase.from('learning_items').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('learning_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    ]);
    setItems((itemsRes.data as LearningItem[]) ?? []);
    setSessions((sessionsRes.data as LearningSession[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (filterCategory !== 'all' && i.category !== filterCategory) return false;
      if (filterStatus !== 'all' && i.status !== filterStatus) return false;
      return true;
    });
  }, [items, filterCategory, filterStatus]);

  const stats = useMemo(() => {
    const completed = items.filter((i) => i.status === 'Completed').length;
    const inProgress = items.filter((i) => i.status === 'In Progress').length;
    const overallProgress = items.length > 0 ? Math.round(items.reduce((s, i) => s + i.progress, 0) / items.length) : 0;
    const totalMinutes = sessions.reduce((s, ses) => s + ses.duration_minutes, 0);
    return { total: items.length, completed, inProgress, overallProgress, totalMinutes };
  }, [items, sessions]);

  const categoryProgress = useMemo(() => {
    const map: Record<string, { total: number; progress: number }> = {};
    items.forEach((i) => {
      if (!map[i.category]) map[i.category] = { total: 0, progress: 0 };
      map[i.category].total++;
      map[i.category].progress += i.progress;
    });
    return Object.entries(map).map(([cat, v]) => ({
      category: cat.length > 15 ? cat.slice(0, 13) + '…' : cat,
      progress: v.total > 0 ? Math.round(v.progress / v.total) : 0,
    }));
  }, [items]);

  function openAdd() { setForm({ ...emptyItem }); setEditId(null); setDialogOpen(true); }
  function openEdit(i: LearningItem) {
    setForm({ topic: i.topic, category: i.category, description: i.description, start_date: i.start_date, target_date: i.target_date, completion_date: i.completion_date, status: i.status, progress: i.progress, difficulty: i.difficulty, resources: i.resources, notes: i.notes, sort_order: i.sort_order });
    setEditId(i.id); setDialogOpen(true);
  }

  async function handleSave() {
    if (!user || !form.topic.trim()) return;
    try {
      if (editId) {
        const { error } = await supabase.from('learning_items').update(form).eq('id', editId);
        if (error) throw error;
        toast.success('Topic updated');
      } else {
        const { error } = await supabase.from('learning_items').insert({ ...form, user_id: user.id });
        if (error) throw error;
        await logActivity(user.id, 'Added learning topic', 'learning', form.topic);
        toast.success('Topic added');
      }
      setDialogOpen(false); loadData();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to save'); }
  }

  async function handleDelete() {
    if (!deleteId || !user) return;
    try { await supabase.from('learning_items').delete().eq('id', deleteId); toast.success('Topic deleted'); loadData(); }
    catch { toast.error('Failed to delete'); }
  }

  async function handleLogSession() {
    if (!user) return;
    try {
      const { error } = await supabase.from('learning_sessions').insert({
        user_id: user.id, date: sessionForm.date, duration_minutes: sessionForm.duration_minutes,
        topic: sessionForm.topic, notes: sessionForm.notes,
        learning_item_id: sessionForm.learning_item_id || null,
        category: items.find((i) => i.id === sessionForm.learning_item_id)?.category || '',
      });
      if (error) throw error;
      await logActivity(user.id, 'Logged learning session', 'learning', `${sessionForm.duration_minutes}m`);
      toast.success('Session logged');
      setSessionDialogOpen(false);
      setSessionForm({ date: new Date().toISOString().split('T')[0], duration_minutes: 30, topic: '', notes: '', learning_item_id: '' });
      loadData();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to log session'); }
  }

  async function addTemplateItem(topic: string, category: LearningCategory) {
    if (!user) return;
    try {
      await supabase.from('learning_items').insert({ topic, category, user_id: user.id, status: 'Not Started' });
      toast.success(`Added: ${topic}`);
      loadData();
    } catch { toast.error('Failed to add template item'); }
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="CS / AI-ML Tracker"
        description="Your long-term computer science and AI learning journey."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTemplateOpen(true)} className="gap-2"><Sparkles className="h-4 w-4" />Templates</Button>
            <Button variant="outline" onClick={() => setSessionDialogOpen(true)} className="gap-2"><Clock className="h-4 w-4" />Log Session</Button>
            <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />Add Topic</Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'Total Topics', value: stats.total },
          { label: 'Completed', value: stats.completed, color: 'text-success' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-cs' },
          { label: 'Overall Progress', value: `${stats.overallProgress}%` },
          { label: 'Study Hours', value: formatDuration(stats.totalMinutes) },
        ].map((m) => (
          <Card key={m.label} className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
            <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${m.color ?? ''}`}>{m.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="topics">
        <TabsList>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="sessions">Study History</TabsTrigger>
        </TabsList>

        {/* Topics Tab */}
        <TabsContent value="topics" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Categories</SelectItem>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : filteredItems.length === 0 ? (
            <EmptyState icon={<BookOpen className="h-5 w-5" />} title="No learning topics yet" description="Add a topic or use a roadmap template to start your learning journey." action={<Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />Add Topic</Button>} />
          ) : (
            <div className="space-y-2">
              {filteredItems.map((i) => (
                <Card key={i.id} className="p-4 transition-colors hover:border-foreground/20">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{i.topic}</span>
                        <span className={`text-xs font-medium ${STATUS_COLORS[i.status]}`}>{i.status}</span>
                        <span className="text-xs text-muted-foreground">{i.category}</span>
                        <span className="text-xs text-muted-foreground capitalize">· {i.difficulty}</span>
                      </div>
                      {i.description && <p className="mt-1 text-sm text-muted-foreground truncate">{i.description}</p>}
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-cs transition-all" style={{ width: `${i.progress}%` }} />
                      </div>
                    </div>
                    <span className="font-display text-sm font-bold tabular-nums">{i.progress}%</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(i)}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-error" onClick={() => setDeleteId(i.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          {categoryProgress.length === 0 ? (
            <EmptyState icon={<Layers className="h-5 w-5" />} title="No category data yet" description="Add learning topics to see category progress." />
          ) : (
            <>
              <Card className="p-5">
                <h3 className="font-display text-[13px] font-semibold uppercase tracking-wider mb-4">Progress by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryProgress} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis type="category" dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 4 }} />
                    <Bar dataKey="progress" fill="hsl(var(--chart-2))" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CATEGORIES.map((cat) => {
                  const catItems = items.filter((i) => i.category === cat);
                  if (catItems.length === 0) return null;
                  const avg = Math.round(catItems.reduce((s, i) => s + i.progress, 0) / catItems.length);
                  const done = catItems.filter((i) => i.status === 'Completed').length;
                  return (
                    <Card key={cat} className="p-4">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{cat}</p>
                      <p className="mt-1 font-display text-2xl font-bold">{avg}%</p>
                      <p className="text-xs text-muted-foreground">{done}/{catItems.length} completed</p>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          {sessions.length === 0 ? (
            <EmptyState icon={<Clock className="h-5 w-5" />} title="No study sessions logged" description="Log your first study session to track your learning hours." action={<Button onClick={() => setSessionDialogOpen(true)} className="gap-2"><Clock className="h-4 w-4" />Log Session</Button>} />
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <Card key={s.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{s.topic || 'Study session'}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(s.date)}{s.category && ` · ${s.category}`}</p>
                      {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
                    </div>
                    <span className="font-display text-sm font-bold tabular-nums">{formatDuration(s.duration_minutes)}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Topic' : 'Add Topic'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Topic</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Binary Search Trees" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as LearningCategory })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as LearningStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Difficulty</Label><Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v as Difficulty })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DIFFICULTIES.map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Progress (%)</Label><Input type="number" min="0" max="100" value={form.progress} onChange={(e) => setForm({ ...form, progress: +e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.start_date ?? ''} onChange={(e) => setForm({ ...form, start_date: e.target.value || null })} /></div>
              <div className="space-y-2"><Label>Target Date</Label><Input type="date" value={form.target_date ?? ''} onChange={(e) => setForm({ ...form, target_date: e.target.value || null })} /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Resources</Label><Textarea rows={2} value={form.resources} onChange={(e) => setForm({ ...form, resources: e.target.value })} placeholder="Links, books, courses..." /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave}>{editId ? 'Update' : 'Add'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Dialog */}
      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Study Session</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={sessionForm.date} onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Duration (min)</Label><Input type="number" min="1" value={sessionForm.duration_minutes} onChange={(e) => setSessionForm({ ...sessionForm, duration_minutes: +e.target.value })} /></div>
              <div className="space-y-2"><Label>Related Topic</Label><Select value={sessionForm.learning_item_id} onValueChange={(v) => setSessionForm({ ...sessionForm, learning_item_id: v })}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="">None</SelectItem>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.topic}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Topic</Label><Input value={sessionForm.topic} onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })} placeholder="What did you study?" /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} value={sessionForm.notes} onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setSessionDialogOpen(false)}>Cancel</Button><Button onClick={handleLogSession}>Log Session</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Roadmap Templates</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Click any item to add it to your learning plan.</p>
            {ROADMAP_TEMPLATES.map((tmpl) => (
              <div key={tmpl.category}>
                <h4 className="font-display text-sm font-semibold mb-2">{tmpl.category}</h4>
                <div className="flex flex-wrap gap-2">
                  {tmpl.items.map((item) => (
                    <Button key={item} variant="outline" size="sm" onClick={() => addTemplateItem(item, tmpl.category)} className="gap-1.5"><Plus className="h-3 w-3" />{item}</Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete topic?" description="This learning topic will be permanently deleted." confirmLabel="Delete" destructive onConfirm={handleDelete} />
    </div>
  );
}
