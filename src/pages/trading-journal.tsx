import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  Eye,
  Filter,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
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
import { formatDate, getLast7Days } from '@/lib/date-utils';
import { toast } from 'sonner';
import type { Trade, TradeDirection, TradingSession, EmotionalState } from '@/types';

const INSTRUMENTS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'Other'];
const SESSIONS: TradingSession[] = ['', 'Asian', 'London', 'New York', 'Sydney', 'Other'];
const EMOTIONS: EmotionalState[] = ['', 'calm', 'confident', 'anxious', 'fearful', 'greedy', 'disciplined', 'impulsive', 'neutral'];

const emptyForm: Omit<Trade, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  trade_date: new Date().toISOString().split('T')[0],
  instrument: 'XAUUSD',
  session: '',
  direction: 'buy',
  entry_price: null,
  stop_loss: null,
  take_profit: null,
  exit_price: null,
  risk_amount: 0,
  result: 0,
  r_multiple: 0,
  strategy: '',
  setup_description: '',
  screenshot_url: '',
  emotional_state: '',
  plan_adherence: 0,
  notes: '',
};

export function TradingJournal() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewTrade, setViewTrade] = useState<Trade | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterInstrument, setFilterInstrument] = useState('all');
  const [filterResult, setFilterResult] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const loadTrades = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('trade_date', { ascending: false });
    setTrades((data as Trade[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadTrades(); }, [loadTrades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (filterInstrument !== 'all' && t.instrument !== filterInstrument) return false;
      if (filterResult === 'win' && t.result <= 0) return false;
      if (filterResult === 'loss' && t.result >= 0) return false;
      if (filterDateFrom && t.trade_date < filterDateFrom) return false;
      if (filterDateTo && t.trade_date > filterDateTo) return false;
      return true;
    });
  }, [trades, filterInstrument, filterResult, filterDateFrom, filterDateTo]);

  const stats = useMemo(() => {
    const total = trades.length;
    const wins = trades.filter((t) => t.result > 0).length;
    const losses = trades.filter((t) => t.result < 0).length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const netR = trades.reduce((s, t) => s + (t.r_multiple || 0), 0);
    const avgR = total > 0 ? +(netR / total).toFixed(2) : 0;
    const avgPlan = total > 0 ? Math.round(trades.reduce((s, t) => s + (t.plan_adherence || 0), 0) / total) : 0;
    return { total, wins, losses, winRate, netR, avgR, avgPlan };
  }, [trades]);

  const weeklyData = useMemo(() => {
    const days = getLast7Days();
    return days.map((d) => {
      const dayTrades = trades.filter((t) => t.trade_date === d.date);
      const r = dayTrades.reduce((s, t) => s + (t.r_multiple || 0), 0);
      return { label: d.label, R: +r.toFixed(2), trades: dayTrades.length };
    });
  }, [trades]);

  function openAdd() {
    setForm({ ...emptyForm, trade_date: new Date().toISOString().split('T')[0] });
    setEditId(null);
    setDialogOpen(true);
  }

  function openEdit(t: Trade) {
    setForm({
      trade_date: t.trade_date, instrument: t.instrument, session: t.session,
      direction: t.direction, entry_price: t.entry_price, stop_loss: t.stop_loss,
      take_profit: t.take_profit, exit_price: t.exit_price, risk_amount: t.risk_amount,
      result: t.result, r_multiple: t.r_multiple, strategy: t.strategy,
      setup_description: t.setup_description, screenshot_url: t.screenshot_url,
      emotional_state: t.emotional_state, plan_adherence: t.plan_adherence, notes: t.notes,
    });
    setEditId(t.id);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!user) return;
    try {
      if (editId) {
        const { error } = await supabase.from('trades').update(form).eq('id', editId);
        if (error) throw error;
        await logActivity(user.id, 'Edited trade', 'trading', form.instrument);
        toast.success('Trade updated');
      } else {
        const { error } = await supabase.from('trades').insert({ ...form, user_id: user.id });
        if (error) throw error;
        await logActivity(user.id, 'Added trade', 'trading', form.instrument);
        toast.success('Trade added');
      }
      setDialogOpen(false);
      loadTrades();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save trade');
    }
  }

  async function handleDelete() {
    if (!deleteId || !user) return;
    try {
      const { error } = await supabase.from('trades').delete().eq('id', deleteId);
      if (error) throw error;
      toast.success('Trade deleted');
      loadTrades();
    } catch {
      toast.error('Failed to delete trade');
    }
  }

  const numVal = (v: string) => (v === '' ? null : +v);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Trading Journal"
        description="Track, review, and improve your trading performance."
        action={<Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />Add Trade</Button>}
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Wins', value: stats.wins, color: 'text-success' },
          { label: 'Losses', value: stats.losses, color: 'text-error' },
          { label: 'Win Rate', value: `${stats.winRate}%` },
          { label: 'Net R', value: stats.netR.toFixed(2), color: stats.netR >= 0 ? 'text-success' : 'text-error' },
          { label: 'Avg R', value: stats.avgR.toFixed(2) },
          { label: 'Plan Adherence', value: `${stats.avgPlan}%` },
        ].map((m) => (
          <Card key={m.label} className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
            <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${m.color ?? ''}`}>{m.value}</p>
          </Card>
        ))}
      </div>

      {/* Weekly Chart */}
      {trades.length > 0 && (
        <Card className="p-5">
          <h3 className="font-display text-[13px] font-semibold uppercase tracking-wider mb-4">Weekly Performance (R-Multiple)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 4 }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="R" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-3.5 w-3.5" /> Filters
        </Button>
        {showFilters && (
          <>
            <Select value={filterInstrument} onValueChange={setFilterInstrument}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Instrument" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Instruments</SelectItem>
                {INSTRUMENTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterResult} onValueChange={setFilterResult}>
              <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Result" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="win">Wins</SelectItem>
                <SelectItem value="loss">Losses</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="h-9 w-36" />
            <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="h-9 w-36" />
            <Button variant="ghost" size="sm" onClick={() => { setFilterInstrument('all'); setFilterResult('all'); setFilterDateFrom(''); setFilterDateTo(''); }}>
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          </>
        )}
      </div>

      {/* Trade List */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading trades...</p>
      ) : filteredTrades.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="h-5 w-5" />}
          title="No trades yet"
          description="Log your first trade to start tracking your performance and building your edge."
          action={<Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />Add Trade</Button>}
        />
      ) : (
        <div className="space-y-2">
          {filteredTrades.map((t) => (
            <Card key={t.id} className="p-4 transition-colors hover:border-foreground/20">
              <div className="flex items-center gap-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-sm ${t.result > 0 ? 'bg-success/10 text-success' : t.result < 0 ? 'bg-error/10 text-error' : 'bg-secondary text-muted-foreground'}`}>
                  {t.result > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.instrument}</span>
                    <span className={`text-xs font-medium uppercase ${t.direction === 'buy' ? 'text-success' : 'text-error'}`}>{t.direction}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(t.trade_date)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.strategy || t.setup_description || 'No description'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-display font-bold tabular-nums text-sm ${t.r_multiple > 0 ? 'text-success' : t.r_multiple < 0 ? 'text-error' : ''}`}>
                    {t.r_multiple > 0 ? '+' : ''}{t.r_multiple.toFixed(2)}R
                  </p>
                  <p className="text-xs text-muted-foreground">{t.result > 0 ? '+' : ''}{t.result}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewTrade(t)}><Eye className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-error" onClick={() => setDeleteId(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Trade' : 'Add Trade'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.trade_date} onChange={(e) => setForm({ ...form, trade_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Instrument</Label>
              <Select value={form.instrument} onValueChange={(v) => setForm({ ...form, instrument: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INSTRUMENTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Session</Label>
              <Select value={form.session} onValueChange={(v) => setForm({ ...form, session: v as TradingSession })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SESSIONS.map((s) => <SelectItem key={s} value={s}>{s || 'None'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v as TradeDirection })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="buy">Buy</SelectItem><SelectItem value="sell">Sell</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Entry Price</Label>
              <Input type="number" step="0.00001" value={form.entry_price ?? ''} onChange={(e) => setForm({ ...form, entry_price: numVal(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Stop Loss</Label>
              <Input type="number" step="0.00001" value={form.stop_loss ?? ''} onChange={(e) => setForm({ ...form, stop_loss: numVal(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Take Profit</Label>
              <Input type="number" step="0.00001" value={form.take_profit ?? ''} onChange={(e) => setForm({ ...form, take_profit: numVal(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Exit Price</Label>
              <Input type="number" step="0.00001" value={form.exit_price ?? ''} onChange={(e) => setForm({ ...form, exit_price: numVal(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Risk Amount</Label>
              <Input type="number" step="0.01" value={form.risk_amount} onChange={(e) => setForm({ ...form, risk_amount: +e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Result</Label>
              <Input type="number" step="0.01" value={form.result} onChange={(e) => setForm({ ...form, result: +e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>R-Multiple</Label>
              <Input type="number" step="0.01" value={form.r_multiple} onChange={(e) => setForm({ ...form, r_multiple: +e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Plan Adherence (%)</Label>
              <Input type="number" min="0" max="100" value={form.plan_adherence} onChange={(e) => setForm({ ...form, plan_adherence: +e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Emotional State</Label>
              <Select value={form.emotional_state} onValueChange={(v) => setForm({ ...form, emotional_state: v as EmotionalState })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EMOTIONS.map((s) => <SelectItem key={s} value={s}>{s || 'None'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Strategy</Label>
              <Input value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value })} placeholder="e.g. Breakout, Mean Reversion" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Setup Description</Label>
              <Textarea rows={2} value={form.setup_description} onChange={(e) => setForm({ ...form, setup_description: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Screenshot URL</Label>
              <Input value={form.screenshot_url} onChange={(e) => setForm({ ...form, screenshot_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editId ? 'Update' : 'Add'} Trade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewTrade} onOpenChange={(open) => !open && setViewTrade(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Trade Details — {viewTrade?.instrument}</DialogTitle></DialogHeader>
          {viewTrade && (
            <div className="grid grid-cols-2 gap-3 py-2 text-sm">
              {[
                ['Date', formatDate(viewTrade.trade_date)],
                ['Session', viewTrade.session || '—'],
                ['Direction', viewTrade.direction.toUpperCase()],
                ['Entry', viewTrade.entry_price ?? '—'],
                ['Stop Loss', viewTrade.stop_loss ?? '—'],
                ['Take Profit', viewTrade.take_profit ?? '—'],
                ['Exit', viewTrade.exit_price ?? '—'],
                ['Risk Amount', viewTrade.risk_amount],
                ['Result', viewTrade.result],
                ['R-Multiple', `${viewTrade.r_multiple}R`],
                ['Plan Adherence', `${viewTrade.plan_adherence}%`],
                ['Emotional State', viewTrade.emotional_state || '—'],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{val}</span>
                </div>
              ))}
              {viewTrade.strategy && <div className="col-span-2"><span className="text-muted-foreground">Strategy: </span>{viewTrade.strategy}</div>}
              {viewTrade.setup_description && <div className="col-span-2"><span className="text-muted-foreground">Setup: </span>{viewTrade.setup_description}</div>}
              {viewTrade.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes: </span>{viewTrade.notes}</div>}
              {viewTrade.screenshot_url && (
                <div className="col-span-2">
                  <a href={viewTrade.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-cs hover:underline">View screenshot</a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete trade?"
        description="This trade record will be permanently deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
