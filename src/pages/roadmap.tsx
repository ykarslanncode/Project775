import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, Map, Target, ChevronDown, ChevronRight } from 'lucide-react';
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
import { formatDate } from '@/lib/date-utils';
import { toast } from 'sonner';
import type { RoadmapPhase, RoadmapMilestone, RoadmapStatus, RoadmapCategory } from '@/types';

const STATUSES: RoadmapStatus[] = ['Not Started', 'In Progress', 'Completed', 'On Hold'];
const CATEGORIES: RoadmapCategory[] = ['Trading', 'Computer Science', 'AI/ML', 'Business', 'English', 'Personal', 'Career', 'General'];

const STATUS_COLORS: Record<string, string> = {
  'Not Started': 'text-muted-foreground',
  'In Progress': 'text-cs',
  'Completed': 'text-success',
  'On Hold': 'text-warning',
};

const emptyPhase: Omit<RoadmapPhase, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  title: '', description: '', start_date: new Date().toISOString().split('T')[0], target_date: null, status: 'Not Started', sort_order: 0,
};
const emptyMilestone: Omit<RoadmapMilestone, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  title: '', category: 'General', description: '', start_date: new Date().toISOString().split('T')[0], target_date: null, status: 'Not Started', progress: 0, notes: '', phase_id: null, sort_order: 0,
};

export function Roadmap() {
  const { user } = useAuth();
  const [phases, setPhases] = useState<RoadmapPhase[]>([]);
  const [milestones, setMilestones] = useState<RoadmapMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [editPhaseId, setEditPhaseId] = useState<string | null>(null);
  const [editMilestoneId, setEditMilestoneId] = useState<string | null>(null);
  const [phaseForm, setPhaseForm] = useState(emptyPhase);
  const [milestoneForm, setMilestoneForm] = useState(emptyMilestone);
  const [deletePhaseId, setDeletePhaseId] = useState<string | null>(null);
  const [deleteMilestoneId, setDeleteMilestoneId] = useState<string | null>(null);
  const [milestonePhaseId, setMilestonePhaseId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [phasesRes, milestonesRes] = await Promise.all([
      supabase.from('roadmap_phases').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('roadmap_milestones').select('*').eq('user_id', user.id).order('sort_order'),
    ]);
    setPhases((phasesRes.data as RoadmapPhase[]) ?? []);
    setMilestones((milestonesRes.data as RoadmapMilestone[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = useMemo(() => {
    const completed = milestones.filter((m) => m.status === 'Completed').length;
    const inProgress = milestones.filter((m) => m.status === 'In Progress').length;
    const overallProgress = milestones.length > 0 ? Math.round(milestones.reduce((s, m) => s + m.progress, 0) / milestones.length) : 0;
    return { totalMilestones: milestones.length, completed, inProgress, overallProgress, totalPhases: phases.length };
  }, [phases, milestones]);

  function togglePhase(id: string) {
    setExpandedPhases((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  function openAddPhase() { setPhaseForm({ ...emptyPhase, start_date: new Date().toISOString().split('T')[0] }); setEditPhaseId(null); setPhaseDialogOpen(true); }
  function openEditPhase(p: RoadmapPhase) { setPhaseForm({ title: p.title, description: p.description, start_date: p.start_date, target_date: p.target_date, status: p.status, sort_order: p.sort_order }); setEditPhaseId(p.id); setPhaseDialogOpen(true); }

  function openAddMilestone(phaseId: string | null) {
    setMilestoneForm({ ...emptyMilestone, phase_id: phaseId, start_date: new Date().toISOString().split('T')[0] });
    setMilestonePhaseId(phaseId); setEditMilestoneId(null); setMilestoneDialogOpen(true);
  }
  function openEditMilestone(m: RoadmapMilestone) {
    setMilestoneForm({ title: m.title, category: m.category, description: m.description, start_date: m.start_date, target_date: m.target_date, status: m.status, progress: m.progress, notes: m.notes, phase_id: m.phase_id, sort_order: m.sort_order });
    setEditMilestoneId(m.id); setMilestoneDialogOpen(true);
  }

  async function savePhase() {
    if (!user || !phaseForm.title.trim()) return;
    try {
      if (editPhaseId) { const { error } = await supabase.from('roadmap_phases').update(phaseForm).eq('id', editPhaseId); if (error) throw error; toast.success('Phase updated'); }
      else { const { error } = await supabase.from('roadmap_phases').insert({ ...phaseForm, user_id: user.id }); if (error) throw error; await logActivity(user.id, 'Added roadmap phase', 'roadmap', phaseForm.title); toast.success('Phase added'); }
      setPhaseDialogOpen(false); loadData();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to save'); }
  }

  async function saveMilestone() {
    if (!user || !milestoneForm.title.trim()) return;
    try {
      if (editMilestoneId) { const { error } = await supabase.from('roadmap_milestones').update(milestoneForm).eq('id', editMilestoneId); if (error) throw error; toast.success('Milestone updated'); }
      else { const { error } = await supabase.from('roadmap_milestones').insert({ ...milestoneForm, user_id: user.id }); if (error) throw error; await logActivity(user.id, 'Added milestone', 'roadmap', milestoneForm.title); toast.success('Milestone added'); }
      setMilestoneDialogOpen(false); loadData();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to save'); }
  }

  async function deletePhase() {
    if (!deletePhaseId) return;
    try { await supabase.from('roadmap_phases').delete().eq('id', deletePhaseId); toast.success('Phase deleted'); loadData(); }
    catch { toast.error('Failed to delete'); }
  }
  async function deleteMilestone() {
    if (!deleteMilestoneId) return;
    try { await supabase.from('roadmap_milestones').delete().eq('id', deleteMilestoneId); toast.success('Milestone deleted'); loadData(); }
    catch { toast.error('Failed to delete'); }
  }

  function renderTimelineItem(m: RoadmapMilestone) {
    return (
      <div key={m.id} className="relative pl-8 pb-6">
        <div className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-border bg-card" />
        <div className="absolute left-[5px] top-4 bottom-0 w-px bg-border" />
        <Card className="border-border bg-card p-4 transition-colors hover:border-foreground/20">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-[13px]">{m.title}</span>
                <span className={`text-xs font-medium ${STATUS_COLORS[m.status]}`}>{m.status}</span>
                <span className="text-xs text-muted-foreground">{m.category}</span>
              </div>
              {m.description && <p className="mt-1 text-xs text-muted-foreground truncate">{m.description}</p>}
              <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                <span>{formatDate(m.start_date)}</span>
                {m.target_date && <span>→ {formatDate(m.target_date)}</span>}
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${m.progress}%` }} />
              </div>
            </div>
            <span className="font-display text-sm font-bold tabular-nums">{m.progress}%</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMilestone(m)}><Edit2 className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-error" onClick={() => setDeleteMilestoneId(m.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Two-Year Roadmap" description="November 2026 to November 2028 — your phases, milestones, and goals."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openAddMilestone(null)} className="gap-2"><Plus className="h-4 w-4" />Milestone</Button>
            <Button onClick={openAddPhase} className="gap-2"><Plus className="h-4 w-4" />Phase</Button>
          </div>
        } />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'Phases', value: stats.totalPhases },
          { label: 'Milestones', value: stats.totalMilestones },
          { label: 'Completed', value: stats.completed, color: 'text-success' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-cs' },
          { label: 'Overall', value: `${stats.overallProgress}%` },
        ].map((m) => (
          <Card key={m.label} className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
            <p className={`mt-1 font-display text-xl font-bold tabular-nums ${m.color ?? ''}`}>{m.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="list">
        <TabsList><TabsTrigger value="list">List View</TabsTrigger><TabsTrigger value="timeline">Timeline</TabsTrigger></TabsList>

        {/* List View */}
        <TabsContent value="list" className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : phases.length === 0 && milestones.length === 0 ? (
            <EmptyState icon={<Map className="h-5 w-5" />} title="No roadmap yet" description="Add phases and milestones to plan your next two years." action={<Button onClick={openAddPhase} className="gap-2"><Plus className="h-4 w-4" />Add Phase</Button>} />
          ) : (
            <>
              {phases.map((p) => {
                const phaseMilestones = milestones.filter((m) => m.phase_id === p.id);
                const isExpanded = expandedPhases.has(p.id);
                return (
                  <Card key={p.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => togglePhase(p.id)} className="text-muted-foreground hover:text-foreground">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{p.title}</span>
                          <span className={`text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{formatDate(p.start_date)}</span>
                          {p.target_date && <span>→ {formatDate(p.target_date)}</span>}
                          <span>{phaseMilestones.length} milestones</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => openAddMilestone(p.id)}><Plus className="h-3 w-3" />Add</Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditPhase(p)}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-error" onClick={() => setDeletePhaseId(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 ml-7 space-y-2">
                        {phaseMilestones.length === 0 ? <p className="text-xs text-muted-foreground py-2">No milestones in this phase yet.</p> : phaseMilestones.map((m) => (
                          <div key={m.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{m.title}</span>
                                <span className={`text-xs ${STATUS_COLORS[m.status]}`}>{m.status}</span>
                                <span className="text-xs text-muted-foreground">{m.category}</span>
                              </div>
                              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
                                <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${m.progress}%` }} />
                              </div>
                            </div>
                            <span className="font-display text-sm font-bold tabular-nums">{m.progress}%</span>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMilestone(m)}><Edit2 className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-error" onClick={() => setDeleteMilestoneId(m.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
              {/* Unassigned milestones */}
              {milestones.filter((m) => !m.phase_id).length > 0 && (
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-[13px]">Unassigned Milestones</span>
                  </div>
                  <div className="space-y-2">
                    {milestones.filter((m) => !m.phase_id).map((m) => (
                      <div key={m.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{m.title}</span>
                            <span className={`text-xs ${STATUS_COLORS[m.status]}`}>{m.status}</span>
                          </div>
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${m.progress}%` }} />
                          </div>
                        </div>
                        <span className="font-display text-sm font-bold tabular-nums">{m.progress}%</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMilestone(m)}><Edit2 className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-error" onClick={() => setDeleteMilestoneId(m.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Timeline View */}
        <TabsContent value="timeline" className="space-y-3">
          {milestones.length === 0 ? (
            <EmptyState icon={<Map className="h-5 w-5" />} title="No milestones yet" description="Add milestones to see them on a timeline." action={<Button onClick={() => openAddMilestone(null)} className="gap-2"><Plus className="h-4 w-4" />Add Milestone</Button>} />
          ) : (
            <div className="space-y-4">
              {[...milestones].sort((a, b) => a.start_date.localeCompare(b.start_date)).map(renderTimelineItem)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Phase Dialog */}
      <Dialog open={phaseDialogOpen} onOpenChange={setPhaseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editPhaseId ? 'Edit Phase' : 'Add Phase'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Title</Label><Input value={phaseForm.title} onChange={(e) => setPhaseForm({ ...phaseForm, title: e.target.value })} placeholder="e.g. Foundation Phase" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={phaseForm.start_date} onChange={(e) => setPhaseForm({ ...phaseForm, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Target Date</Label><Input type="date" value={phaseForm.target_date ?? ''} onChange={(e) => setPhaseForm({ ...phaseForm, target_date: e.target.value || null })} /></div>
            </div>
            <div className="space-y-2"><Label>Status</Label><Select value={phaseForm.status} onValueChange={(v) => setPhaseForm({ ...phaseForm, status: v as RoadmapStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={2} value={phaseForm.description} onChange={(e) => setPhaseForm({ ...phaseForm, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPhaseDialogOpen(false)}>Cancel</Button><Button onClick={savePhase}>{editPhaseId ? 'Update' : 'Add'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Milestone Dialog */}
      <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editMilestoneId ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Title</Label><Input value={milestoneForm.title} onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} placeholder="e.g. Master React Fundamentals" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label><Select value={milestoneForm.category} onValueChange={(v) => setMilestoneForm({ ...milestoneForm, category: v as RoadmapCategory })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Status</Label><Select value={milestoneForm.status} onValueChange={(v) => setMilestoneForm({ ...milestoneForm, status: v as RoadmapStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={milestoneForm.start_date} onChange={(e) => setMilestoneForm({ ...milestoneForm, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Target Date</Label><Input type="date" value={milestoneForm.target_date ?? ''} onChange={(e) => setMilestoneForm({ ...milestoneForm, target_date: e.target.value || null })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Progress (%)</Label><Input type="number" min="0" max="100" value={milestoneForm.progress} onChange={(e) => setMilestoneForm({ ...milestoneForm, progress: +e.target.value })} /></div>
              <div className="space-y-2"><Label>Phase</Label><Select value={milestoneForm.phase_id ?? ''} onValueChange={(v) => setMilestoneForm({ ...milestoneForm, phase_id: v || null })}><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent><SelectItem value="">Unassigned</SelectItem>{phases.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={2} value={milestoneForm.description} onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} value={milestoneForm.notes} onChange={(e) => setMilestoneForm({ ...milestoneForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setMilestoneDialogOpen(false)}>Cancel</Button><Button onClick={saveMilestone}>{editMilestoneId ? 'Update' : 'Add'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deletePhaseId} onOpenChange={(o) => !o && setDeletePhaseId(null)} title="Delete phase?" description="This phase and all its milestones will be deleted." confirmLabel="Delete" destructive onConfirm={deletePhase} />
      <ConfirmDialog open={!!deleteMilestoneId} onOpenChange={(o) => !o && setDeleteMilestoneId(null)} title="Delete milestone?" description="This milestone will be permanently deleted." confirmLabel="Delete" destructive onConfirm={deleteMilestone} />
    </div>
  );
}
