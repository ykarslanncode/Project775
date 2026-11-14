import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  TrendingUp,
  Brain,
  FlaskConical,
  Languages,
  CheckSquare,
  Flame,
  Activity,
  Trash2,
  Check,
  Clock,
  Target,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  useCommandCenterData,
  addCommitment,
  toggleCommitment,
  deleteCommitment,
} from '@/hooks/use-command-center';
import { CircularProgress } from '@/components/ui/circular-progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/date-utils';
import { toast } from 'sonner';
import type { Priority, CommitmentCategory } from '@/types';

const HERO_IMAGE = 'https://images.pexels.com/photos/1730/dawn-sunset-night-sunrise.jpg?auto=compress&cs=tinysrgb&w=1600';

const CATEGORY_LABELS: Record<string, string> = {
  trading: 'Trading',
  cs: 'Computer Science',
  ai: 'AI / ML',
  business: 'Business',
  english: 'English',
  health: 'Health',
  personal: 'Personal',
  general: 'General',
};

const CATEGORY_COLORS: Record<string, string> = {
  trading: 'text-trading',
  cs: 'text-cs',
  ai: 'text-ai',
  business: 'text-business',
  english: 'text-english',
  health: 'text-success',
  personal: 'text-foreground',
  general: 'text-muted-foreground',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-error',
  medium: 'text-warning',
  low: 'text-muted-foreground',
};

export function CommandCenter() {
  const { user, profile } = useAuth();
  const data = useCommandCenterData();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newCategory, setNewCategory] = useState<CommitmentCategory>('general');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'there';

  async function handleAdd() {
    if (!newTitle.trim() || !user) return;
    try {
      await addCommitment(user.id, newTitle.trim(), newPriority, newCategory);
      setNewTitle('');
      setShowAddForm(false);
      toast.success('Commitment added');
      data.reloadData();
    } catch {
      toast.error('Failed to add commitment');
    }
  }

  async function handleToggle(id: string, completed: boolean) {
    if (!user) return;
    try {
      await toggleCommitment(id, completed, user.id);
      data.reloadData();
    } catch {
      toast.error('Failed to update');
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteCommitment(deleteId);
      toast.success('Commitment deleted');
      data.reloadData();
    } catch {
      toast.error('Failed to delete');
    }
  }

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[13px] text-muted-foreground">Loading your command center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-lg border border-border">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/20" />
        <div className="relative px-8 py-10 lg:px-10 lg:py-12">
          <div className="flex items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                {greeting}, {displayName}
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-foreground lg:text-4xl">
                Build Yourself
              </h1>
              <p className="mt-2.5 max-w-md text-[13px] leading-relaxed text-muted-foreground lg:text-sm">
                Consistency compounds. Every commitment completed, every session logged, every trade reviewed —
                it all adds up over two years.
              </p>
            </div>
            <div className="hidden shrink-0 sm:block">
              <CircularProgress
                value={data.dailyCompletionRate}
                label={`${data.dailyCompletionRate}%`}
                sublabel="Today"
                size={96}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Progress + Overall Progress */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Daily Progress */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Daily Progress</p>
              <p className="mt-1 font-display text-xl font-bold text-foreground">
                {data.completedCommitments.length}
                <span className="text-muted-foreground">/{data.todayCommitments.length}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">commitments completed</p>
            </div>
            <CircularProgress
              value={data.dailyCompletionRate}
              label={`${data.dailyCompletionRate}%`}
              size={68}
              strokeWidth={4}
            />
          </div>
        </Card>

        {/* Overall Progress */}
        <Card className="p-5 lg:col-span-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Overall Progress</p>
          <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: 'Trading', value: data.winRate, suffix: '%', color: 'text-trading', link: '/app/trading' },
              { label: 'CS', value: data.overallLearningProgress, suffix: '%', color: 'text-cs', link: '/app/learning' },
              { label: 'AI / ML', value: data.overallLearningProgress, suffix: '%', color: 'text-ai', link: '/app/learning' },
              { label: 'Business', value: data.activeExperiments.length, suffix: '', color: 'text-business', link: '/app/business' },
              { label: 'English', value: data.weeklyEnglishMinutes, suffix: 'm', color: 'text-english', link: '/app/english' },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.link}
                className="group rounded-md border border-border p-3 transition-colors hover:border-foreground/20"
              >
                <p className={cn('font-display text-xl font-bold tabular-nums', item.color)}>
                  {item.value}
                  <span className="text-[13px] font-normal">{item.suffix}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground group-hover:text-foreground/70">{item.label}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Today's Commitments + Weekly Focus */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Today's Commitments */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[13px] font-semibold uppercase tracking-wider text-foreground">Today's Commitments</h3>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>

          {showAddForm && (
            <div className="mt-3.5 flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row">
              <Input
                placeholder="What will you commit to today?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="h-9 flex-1"
                autoFocus
              />
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as Priority)}>
                <SelectTrigger className="h-9 w-full sm:w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as CommitmentCategory)}>
                <SelectTrigger className="h-9 w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-9" onClick={handleAdd}>Add</Button>
            </div>
          )}

          <div className="mt-3.5 space-y-1">
            {data.todayCommitments.length === 0 ? (
              <EmptyState
                icon={<Target className="h-4 w-4" />}
                title="No commitments yet"
                description="Add your first commitment for today and start building momentum."
                className="py-6"
              />
            ) : (
              data.todayCommitments.map((c) => (
                <div
                  key={c.id}
                  className="group flex items-center gap-3 rounded-md border border-transparent px-2.5 py-2 transition-colors hover:border-border hover:bg-secondary/30"
                >
                  <button
                    onClick={() => handleToggle(c.id, !c.completed)}
                    className={cn(
                      'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors',
                      c.completed
                        ? 'border-success bg-success text-background'
                        : 'border-border hover:border-foreground/30'
                    )}
                  >
                    {c.completed && <Check className="h-3 w-3" />}
                  </button>
                  <div className="flex-1 overflow-hidden">
                    <p
                      className={cn(
                        'text-[13px]',
                        c.completed && 'text-muted-foreground line-through'
                      )}
                    >
                      {c.title}
                    </p>
                  </div>
                  <span className={cn('text-[11px] font-medium', PRIORITY_COLORS[c.priority])}>
                    {c.priority}
                  </span>
                  <span className={cn('hidden text-[11px] sm:inline', CATEGORY_COLORS[c.category])}>
                    {CATEGORY_LABELS[c.category]}
                  </span>
                  <button
                    onClick={() => setDeleteId(c.id)}
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Weekly Focus + Streaks */}
        <div className="space-y-4">
          {/* Weekly Focus */}
          <Card className="p-5">
            <h3 className="font-display text-[13px] font-semibold uppercase tracking-wider text-foreground">Weekly Focus</h3>
            <div className="mt-3.5 space-y-2.5">
              <div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-medium tabular-nums text-foreground">{data.weeklyCompletionRate}%</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-foreground transition-all duration-400"
                    style={{ width: `${data.weeklyCompletionRate}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {data.settings?.weekly_goal_text || 'Set your weekly goal in Settings.'}
              </p>
            </div>
          </Card>

          {/* Streaks */}
          <Card className="p-5">
            <h3 className="font-display text-[13px] font-semibold uppercase tracking-wider text-foreground">Streaks</h3>
            <div className="mt-3.5 space-y-2">
              {[
                { label: 'Daily Check-ins', value: data.checkinStreak, icon: CheckSquare },
                { label: 'Learning', value: data.learningStreak, icon: Brain },
                { label: 'English Practice', value: data.englishStreak, icon: Languages },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[13px] text-muted-foreground">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {s.value > 0 && <Flame className="h-3 w-3 text-warning" />}
                      <span className="font-display text-[13px] font-bold tabular-nums text-foreground">{s.value}</span>
                      <span className="text-[11px] text-muted-foreground">d</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="p-5">
          <h3 className="font-display text-[13px] font-semibold uppercase tracking-wider text-foreground">Quick Actions</h3>
          <div className="mt-3.5 grid grid-cols-2 gap-2">
            {[
              { label: 'Add Trade', icon: TrendingUp, link: '/app/trading', color: 'text-trading' },
              { label: 'Log Study', icon: Brain, link: '/app/learning', color: 'text-cs' },
              { label: 'Add Experiment', icon: FlaskConical, link: '/app/business', color: 'text-business' },
              { label: 'Log English', icon: Languages, link: '/app/english', color: 'text-english' },
              { label: 'Daily Check-in', icon: CheckSquare, link: '/app/checkins', color: 'text-success' },
              { label: 'Weekly Review', icon: Activity, link: '/app/reviews', color: 'text-foreground' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  to={action.link}
                  className="group flex flex-col items-start gap-2 rounded-md border border-border p-3 transition-colors hover:border-foreground/20 hover:bg-secondary/30"
                >
                  <Icon className={cn('h-4 w-4', action.color)} />
                  <span className="text-[11px] font-medium text-foreground">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-display text-[13px] font-semibold uppercase tracking-wider text-foreground">Recent Activity</h3>
          <div className="mt-3.5 space-y-px">
            {data.recentActivity.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-4 w-4" />}
                title="No activity yet"
                description="Your recent actions will appear here as you use the app."
                className="py-6"
              />
            ) : (
              data.recentActivity.map((log) => (
                <div key={log.id} className="flex items-center gap-3 py-1.5 text-[13px]">
                  <div className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                  <span className="text-foreground">{log.action}</span>
                  {log.description && (
                    <span className="truncate text-muted-foreground">— {log.description}</span>
                  )}
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                    {formatRelative(log.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete commitment?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
