import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, CalendarRange, Trash2 } from 'lucide-react';
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, getWeekStart } from '@/lib/date-utils';
import { toast } from 'sonner';
import type { WeeklyReview } from '@/types';

const emptyForm = {
  week_starting: getWeekStart(), main_achievements: '', completed_goals: '', incomplete_goals: '',
  biggest_lessons: '', biggest_mistakes: '', trading_review: '', learning_review: '',
  business_review: '', english_review: '', what_went_well: '', what_went_badly: '',
  what_to_change: '', next_week_objective: '',
};

const REVIEW_FIELDS: { key: keyof typeof emptyForm; label: string; placeholder: string }[] = [
  { key: 'main_achievements', label: 'Main Achievements', placeholder: 'What did you achieve this week?' },
  { key: 'completed_goals', label: 'Completed Goals', placeholder: 'Which goals did you complete?' },
  { key: 'incomplete_goals', label: 'Incomplete Goals', placeholder: 'Which goals did you not complete?' },
  { key: 'biggest_lessons', label: 'Biggest Lessons', placeholder: 'What did you learn?' },
  { key: 'biggest_mistakes', label: 'Biggest Mistakes', placeholder: 'What mistakes did you make?' },
  { key: 'trading_review', label: 'Trading Review', placeholder: 'How did your trading go?' },
  { key: 'learning_review', label: 'Learning Review', placeholder: 'How did your learning go?' },
  { key: 'business_review', label: 'Business Review', placeholder: 'How did your business experiments go?' },
  { key: 'english_review', label: 'English Review', placeholder: 'How did your English practice go?' },
  { key: 'what_went_well', label: 'What Went Well?', placeholder: 'Positive highlights...' },
  { key: 'what_went_badly', label: 'What Went Badly?', placeholder: 'Things that did not go well...' },
  { key: 'what_to_change', label: 'What Should Change Next Week?', placeholder: 'Adjustments to make...' },
  { key: 'next_week_objective', label: "Next Week's Main Objective", placeholder: 'Your primary focus for next week...' },
];

export function WeeklyReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewReview, setViewReview] = useState<WeeklyReview | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('weekly_reviews').select('*').eq('user_id', user.id).order('week_starting', { ascending: false });
    setReviews((data as WeeklyReview[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  function openAdd() { setForm({ ...emptyForm, week_starting: getWeekStart() }); setEditId(null); setDialogOpen(true); }
  function openEdit(r: WeeklyReview) {
    setForm({ week_starting: r.week_starting, main_achievements: r.main_achievements, completed_goals: r.completed_goals, incomplete_goals: r.incomplete_goals, biggest_lessons: r.biggest_lessons, biggest_mistakes: r.biggest_mistakes, trading_review: r.trading_review, learning_review: r.learning_review, business_review: r.business_review, english_review: r.english_review, what_went_well: r.what_went_well, what_went_badly: r.what_went_badly, what_to_change: r.what_to_change, next_week_objective: r.next_week_objective });
    setEditId(r.id); setDialogOpen(true);
  }

  async function handleSave() {
    if (!user) return;
    try {
      if (editId) {
        const { error } = await supabase.from('weekly_reviews').update(form).eq('id', editId);
        if (error) throw error;
        toast.success('Review updated');
      } else {
        const { error } = await supabase.from('weekly_reviews').insert({ ...form, user_id: user.id });
        if (error) throw error;
        await logActivity(user.id, 'Completed weekly review', 'review', form.week_starting);
        toast.success('Review saved');
      }
      setDialogOpen(false); loadData();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to save review'); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await supabase.from('weekly_reviews').delete().eq('id', deleteId); toast.success('Review deleted'); loadData(); }
    catch { toast.error('Failed to delete'); }
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Weekly Reviews" description="Guided reflection on your week across all areas."
        action={<Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />New Review</Button>} />

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : reviews.length === 0 ? (
        <EmptyState icon={<CalendarRange className="h-5 w-5" />} title="No reviews yet" description="Create your first weekly review to reflect on your progress." action={<Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />New Review</Button>} />
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <Card key={r.id} className="p-4 transition-colors hover:border-foreground/20">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Week of {formatDate(r.week_starting, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  {r.next_week_objective && <p className="mt-1 text-sm text-muted-foreground truncate">Next week: {r.next_week_objective}</p>}
                  {r.main_achievements && <p className="text-xs text-muted-foreground truncate">Achievements: {r.main_achievements}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewReview(r)}><CalendarRange className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-error" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Review' : 'New Weekly Review'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Week Starting</Label><Input type="date" value={form.week_starting} onChange={(e) => setForm({ ...form, week_starting: e.target.value })} disabled={!!editId} /></div>
            {REVIEW_FIELDS.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label>{f.label}</Label>
                <Textarea rows={2} value={form[f.key] as string} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} />
              </div>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave}>{editId ? 'Update' : 'Save'} Review</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewReview} onOpenChange={(o) => !o && setViewReview(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Week of {viewReview && formatDate(viewReview.week_starting, { month: 'long', day: 'numeric', year: 'numeric' })}</DialogTitle></DialogHeader>
          {viewReview && (
            <div className="space-y-3 py-2">
              {REVIEW_FIELDS.map((f) => {
                const val = viewReview[f.key as keyof WeeklyReview] as string;
                if (!val) return null;
                return (
                  <div key={f.key} className="border-b border-border pb-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{f.label}</p>
                    <p className="text-sm">{val}</p>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete review?" description="This weekly review will be permanently deleted." confirmLabel="Delete" destructive onConfirm={handleDelete} />
    </div>
  );
}
