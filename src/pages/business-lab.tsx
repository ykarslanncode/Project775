import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, FlaskConical, Users, DollarSign, TrendingUp } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
import { formatDate, formatCurrency } from '@/lib/date-utils';
import { toast } from 'sonner';
import type { BusinessExperiment, ValidationStatus } from '@/types';

const STATUSES: ValidationStatus[] = ['Idea', 'Testing', 'Validated', 'Failed', 'Paused'];
const STATUS_COLORS: Record<string, string> = {
  Idea: 'text-muted-foreground',
  Testing: 'text-warning',
  Validated: 'text-success',
  Failed: 'text-error',
  Paused: 'text-muted-foreground',
};
const PIE_COLORS: Record<string, string> = {
  Idea: 'hsl(var(--muted-foreground))',
  Testing: 'hsl(var(--accent-warning))',
  Validated: 'hsl(var(--accent-success))',
  Failed: 'hsl(var(--accent-error))',
  Paused: 'hsl(var(--muted))',
};

const emptyForm: Omit<BusinessExperiment, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  idea_name: '', description: '', problem: '', target_audience: '', proposed_solution: '',
  estimated_budget: 0, actual_spending: 0, currency: 'PKR', start_date: new Date().toISOString().split('T')[0],
  end_date: null, validation_status: 'Idea', customer_feedback: '', people_interviewed: 0,
  interested_customers: 0, revenue: 0, lessons_learned: '', next_steps: '',
};

export function BusinessLab() {
  const { user } = useAuth();
  const [experiments, setExperiments] = useState<BusinessExperiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('business_experiments').select('*').eq('user_id', user.id).order('start_date', { ascending: false });
    setExperiments((data as BusinessExperiment[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = useMemo(() => {
    const total = experiments.length;
    const active = experiments.filter((e) => e.validation_status === 'Testing' || e.validation_status === 'Idea').length;
    const validated = experiments.filter((e) => e.validation_status === 'Validated').length;
    const totalRevenue = experiments.reduce((s, e) => s + e.revenue, 0);
    const totalSpending = experiments.reduce((s, e) => s + e.actual_spending, 0);
    const totalBudget = experiments.reduce((s, e) => s + e.estimated_budget, 0);
    return { total, active, validated, totalRevenue, totalSpending, totalBudget };
  }, [experiments]);

  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    experiments.forEach((e) => { map[e.validation_status] = (map[e.validation_status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [experiments]);

  const spendingData = useMemo(() => {
    return experiments.map((e) => ({
      name: e.idea_name.length > 12 ? e.idea_name.slice(0, 10) + '…' : e.idea_name,
      budget: e.estimated_budget,
      spent: e.actual_spending,
      revenue: e.revenue,
    }));
  }, [experiments]);

  function openAdd() { setForm({ ...emptyForm, start_date: new Date().toISOString().split('T')[0] }); setEditId(null); setDialogOpen(true); }
  function openEdit(e: BusinessExperiment) {
    setForm({ idea_name: e.idea_name, description: e.description, problem: e.problem, target_audience: e.target_audience, proposed_solution: e.proposed_solution, estimated_budget: e.estimated_budget, actual_spending: e.actual_spending, currency: e.currency, start_date: e.start_date, end_date: e.end_date, validation_status: e.validation_status, customer_feedback: e.customer_feedback, people_interviewed: e.people_interviewed, interested_customers: e.interested_customers, revenue: e.revenue, lessons_learned: e.lessons_learned, next_steps: e.next_steps });
    setEditId(e.id); setDialogOpen(true);
  }

  async function handleSave() {
    if (!user || !form.idea_name.trim()) return;
    try {
      if (editId) {
        const { error } = await supabase.from('business_experiments').update(form).eq('id', editId);
        if (error) throw error;
        toast.success('Experiment updated');
      } else {
        const { error } = await supabase.from('business_experiments').insert({ ...form, user_id: user.id });
        if (error) throw error;
        await logActivity(user.id, 'Added business experiment', 'business', form.idea_name);
        toast.success('Experiment added');
      }
      setDialogOpen(false); loadData();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to save'); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await supabase.from('business_experiments').delete().eq('id', deleteId); toast.success('Experiment deleted'); loadData(); }
    catch { toast.error('Failed to delete'); }
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Business Lab"
        description="Test, validate, and learn from business ideas. Currency: PKR."
        action={<Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />Add Experiment</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total Experiments', value: stats.total },
          { label: 'Active', value: stats.active, color: 'text-warning' },
          { label: 'Validated', value: stats.validated, color: 'text-success' },
          { label: 'Revenue', value: formatCurrency(stats.totalRevenue), color: 'text-success' },
        ].map((m) => (
          <Card key={m.label} className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
            <p className={`mt-1 font-display text-xl font-bold tabular-nums ${m.color ?? ''}`}>{m.value}</p>
          </Card>
        ))}
      </div>

      {/* Budget summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Budget</p><p className="mt-1 font-display text-xl font-bold">{formatCurrency(stats.totalBudget)}</p></Card>
        <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Spent</p><p className="mt-1 font-display text-xl font-bold text-error">{formatCurrency(stats.totalSpending)}</p></Card>
        <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Net P/L</p><p className={`mt-1 font-display text-xl font-bold ${stats.totalRevenue - stats.totalSpending >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(stats.totalRevenue - stats.totalSpending)}</p></Card>
      </div>

      {experiments.length > 0 && (
        <Tabs defaultValue="list">
          <TabsList><TabsTrigger value="list">Experiments</TabsTrigger><TabsTrigger value="charts">Analytics</TabsTrigger></TabsList>

          <TabsContent value="list" className="space-y-2">
            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : experiments.length === 0 ? (
              <EmptyState icon={<FlaskConical className="h-5 w-5" />} title="No experiments yet" description="Add your first business idea and start validating it." action={<Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />Add Experiment</Button>} />
            ) : experiments.map((e) => (
              <Card key={e.id} className="p-4 transition-colors hover:border-foreground/20">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{e.idea_name}</span>
                      <span className={`text-xs font-medium ${STATUS_COLORS[e.validation_status]}`}>{e.validation_status}</span>
                    </div>
                    {e.description && <p className="mt-1 text-sm text-muted-foreground truncate">{e.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Spent: {formatCurrency(e.actual_spending)}</span>
                      <span>Revenue: <span className="text-success">{formatCurrency(e.revenue)}</span></span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{e.people_interviewed} interviewed</span>
                      <span>{formatDate(e.start_date)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-error" onClick={() => setDeleteId(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="charts" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <h3 className="font-display text-[13px] font-semibold uppercase tracking-wider mb-4">Status Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {statusData.map((entry) => <Cell key={entry.name} fill={PIE_COLORS[entry.name] || 'hsl(var(--muted))'} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 4 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-5">
                <h3 className="font-display text-[13px] font-semibold uppercase tracking-wider mb-4">Budget vs Spending vs Revenue</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={spendingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 4 }} />
                    <Bar dataKey="budget" fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="spent" fill="hsl(var(--accent-error))" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="revenue" fill="hsl(var(--accent-success))" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {experiments.length === 0 && !loading && (
        <EmptyState icon={<FlaskConical className="h-5 w-5" />} title="No experiments yet" description="Add your first business idea and start validating it with real customers." action={<Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />Add Experiment</Button>} />
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Experiment' : 'Add Experiment'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2"><Label>Idea Name</Label><Input value={form.idea_name} onChange={(e) => setForm({ ...form, idea_name: e.target.value })} /></div>
            <div className="col-span-2 space-y-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="col-span-2 space-y-2"><Label>Problem Being Solved</Label><Textarea rows={2} value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} /></div>
            <div className="space-y-2"><Label>Target Audience</Label><Input value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} /></div>
            <div className="space-y-2"><Label>Validation Status</Label><Select value={form.validation_status} onValueChange={(v) => setForm({ ...form, validation_status: v as ValidationStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2 space-y-2"><Label>Proposed Solution</Label><Textarea rows={2} value={form.proposed_solution} onChange={(e) => setForm({ ...form, proposed_solution: e.target.value })} /></div>
            <div className="space-y-2"><Label>Estimated Budget (PKR)</Label><Input type="number" value={form.estimated_budget} onChange={(e) => setForm({ ...form, estimated_budget: +e.target.value })} /></div>
            <div className="space-y-2"><Label>Actual Spending (PKR)</Label><Input type="number" value={form.actual_spending} onChange={(e) => setForm({ ...form, actual_spending: +e.target.value })} /></div>
            <div className="space-y-2"><Label>Revenue (PKR)</Label><Input type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: +e.target.value })} /></div>
            <div className="space-y-2"><Label>People Interviewed</Label><Input type="number" min="0" value={form.people_interviewed} onChange={(e) => setForm({ ...form, people_interviewed: +e.target.value })} /></div>
            <div className="space-y-2"><Label>Interested Customers</Label><Input type="number" min="0" value={form.interested_customers} onChange={(e) => setForm({ ...form, interested_customers: +e.target.value })} /></div>
            <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.end_date ?? ''} onChange={(e) => setForm({ ...form, end_date: e.target.value || null })} /></div>
            <div className="col-span-2 space-y-2"><Label>Customer Feedback</Label><Textarea rows={2} value={form.customer_feedback} onChange={(e) => setForm({ ...form, customer_feedback: e.target.value })} /></div>
            <div className="col-span-2 space-y-2"><Label>Lessons Learned</Label><Textarea rows={2} value={form.lessons_learned} onChange={(e) => setForm({ ...form, lessons_learned: e.target.value })} /></div>
            <div className="col-span-2 space-y-2"><Label>Next Steps</Label><Textarea rows={2} value={form.next_steps} onChange={(e) => setForm({ ...form, next_steps: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave}>{editId ? 'Update' : 'Add'} Experiment</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete experiment?" description="This experiment and all its data will be permanently deleted." confirmLabel="Delete" destructive onConfirm={handleDelete} />
    </div>
  );
}
