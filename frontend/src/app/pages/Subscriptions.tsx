import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { BadgeIndianRupee, Ban, CalendarClock, CheckCircle2, Search, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../services/api';

interface Plan {
  plan_code: string;
  plan_name: string;
  duration_months: number;
  monthly_rate: number;
  discount_percent: number;
  discount_amount: number;
  final_price: number;
  trainer_addon_note: string;
}

interface Trainer {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface SubscriptionRow {
  member_id: number;
  reg_no: string;
  first_name: string;
  last_name: string;
  email: string;
  membership_status: string;
  plan_code?: string | null;
  plan_name?: string | null;
  duration_months?: number | null;
  final_plan_price?: number | null;
  trainer_addon_enabled?: number | boolean | null;
  trainer_id?: number | null;
  trainer_addon_monthly_price?: number | null;
  trainer_addon_price?: number | null;
  total_price?: number | null;
  subscription_status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  termination_reason?: string | null;
  trainer_name?: string | null;
}

interface EditorState {
  memberId: number;
  memberName: string;
  planCode: string;
  startDate: string;
  trainerAddonEnabled: boolean;
  trainerId: string;
  trainerAddonPrice: string;
}

function todayString() {
  return new Date().toISOString().split('T')[0];
}

export default function Subscriptions() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [terminationReason, setTerminationReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configResponse, subscriptionsResponse] = await Promise.all([
        api.get('/subscription-config'),
        api.get('/subscriptions'),
      ]);
      setPlans(configResponse.data?.plans || []);
      setTrainers(configResponse.data?.trainers || []);
      setRows(subscriptionsResponse.data?.subscriptions || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      `${row.first_name || ''} ${row.last_name || ''}`.toLowerCase().includes(query) ||
      (row.email || '').toLowerCase().includes(query) ||
      (row.reg_no || '').toLowerCase().includes(query)
    );
  }, [rows, search]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.plan_code === editor?.planCode) || null,
    [plans, editor?.planCode]
  );

  const pricingPreview = useMemo(() => {
    if (!selectedPlan) return null;
    const addonMonthlyPrice = Number(editor?.trainerAddonEnabled ? editor?.trainerAddonPrice || 0 : 0);
    const addonTotalPrice = addonMonthlyPrice * selectedPlan.duration_months;
    return {
      planPrice: selectedPlan.final_price,
      addonMonthlyPrice,
      addonTotalPrice,
      totalPrice: selectedPlan.final_price + addonTotalPrice,
    };
  }, [selectedPlan, editor?.trainerAddonEnabled, editor?.trainerAddonPrice]);

  const openEditor = (row: SubscriptionRow) => {
    setTerminationReason(row.termination_reason || '');
    setEditor({
      memberId: row.member_id,
      memberName: `${row.first_name} ${row.last_name}`.trim(),
      planCode: row.plan_code || 'monthly',
      startDate: row.start_date || todayString(),
      trainerAddonEnabled: Boolean(row.trainer_addon_enabled),
      trainerId: row.trainer_id ? String(row.trainer_id) : '',
      trainerAddonPrice: row.trainer_addon_monthly_price ? String(row.trainer_addon_monthly_price) : '',
    });
  };

  const saveSubscription = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editor) return;
    try {
      await api.post(`/subscriptions/${editor.memberId}`, {
        plan_code: editor.planCode,
        start_date: editor.startDate,
        trainer_addon_enabled: editor.trainerAddonEnabled,
        trainer_id: editor.trainerAddonEnabled ? editor.trainerId || null : null,
        trainer_addon_monthly_price: editor.trainerAddonEnabled ? Number(editor.trainerAddonPrice || 0) : 0,
      });
      toast.success('Subscription updated');
      setEditor(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save subscription');
    }
  };

  const terminateSubscription = async () => {
    if (!editor) return;
    try {
      await api.post(`/subscriptions/terminate/${editor.memberId}`, {
        reason: terminationReason || 'Subscription terminated for misconduct',
      });
      toast.success('Subscription terminated');
      setEditor(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to terminate subscription');
    }
  };

  const renewSubscription = async () => {
    if (!editor) return;
    try {
      await api.post(`/subscriptions/renew/${editor.memberId}`);
      toast.success('Subscription renewed');
      setEditor(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to renew subscription');
    }
  };

  return (
    <DashboardLayout title="Subscriptions">
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <BadgeIndianRupee className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Subscription Management</h2>
              <p className="text-sm text-muted-foreground">
                Admin and owner can assign plans, add personal trainer pricing, and terminate any member subscription for misconduct.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <div key={plan.plan_code} className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">{plan.plan_name}</p>
              <p className="mt-2 text-2xl font-semibold">Rs {plan.final_price.toLocaleString('en-IN')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.duration_months} month{plan.duration_months > 1 ? 's' : ''} at Rs {plan.monthly_rate.toLocaleString('en-IN')} per month
              </p>
              <p className="mt-2 text-sm text-green-500">
                Discount: {plan.discount_percent}% (Rs {plan.discount_amount.toLocaleString('en-IN')})
              </p>
              <p className="mt-3 text-xs text-muted-foreground">{plan.trainer_addon_note}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search member by name, email, or registration number"
              className="w-full rounded-xl border border-border bg-input py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-4 text-left text-sm font-semibold">Member</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Plan</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Start Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">End Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Trainer Add-on</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Total Price</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.member_id} className="border-b border-border transition-colors hover:bg-muted/20">
                    <td className="px-6 py-4">
                      <Link
                        to={`/subscriptions/${row.member_id}`}
                        className="font-medium transition-colors hover:text-primary"
                      >
                        {row.first_name} {row.last_name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{row.reg_no} - {row.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm">{row.plan_name || 'Not assigned'}</td>
                    <td className="px-6 py-4 text-sm">{row.start_date || '-'}</td>
                    <td className="px-6 py-4 text-sm">{row.end_date || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      {row.trainer_addon_enabled
                        ? `${row.trainer_name || 'Trainer selected'} - Rs ${Number(row.trainer_addon_monthly_price || 0).toLocaleString('en-IN')}/month`
                        : 'No add-on'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      Rs {Number(row.total_price || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                        row.subscription_status === 'terminated'
                          ? 'bg-red-500/10 text-red-500'
                          : row.subscription_status === 'active'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-yellow-500/10 text-yellow-600'
                      }`}>
                        {row.subscription_status || 'not set'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => openEditor(row)}
                        className="rounded-xl bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-muted-foreground">
                      No members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Manage Subscription</h3>
                <p className="text-sm text-muted-foreground">{editor.memberName}</p>
              </div>
              <button
                onClick={() => setEditor(null)}
                className="rounded-xl border border-border px-4 py-2 hover:bg-muted"
              >
                Close
              </button>
            </div>

            <form onSubmit={saveSubscription} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <select
                    value={editor.planCode}
                    onChange={(event) => setEditor({ ...editor, planCode: event.target.value })}
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {plans.map((plan) => (
                      <option key={plan.plan_code} value={plan.plan_code}>
                        {plan.plan_name} - Rs {plan.final_price.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm text-muted-foreground">Subscription Start Date</span>
                  <input
                    type="date"
                    value={editor.startDate}
                    onChange={(event) => setEditor({ ...editor, startDate: event.target.value })}
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={editor.trainerAddonEnabled}
                    onChange={(event) => setEditor({ ...editor, trainerAddonEnabled: event.target.checked })}
                  />
                  <span className="font-medium">Enable personal trainer add-on (2 hours)</span>
                </label>
                {editor.trainerAddonEnabled && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-sm text-muted-foreground">Trainer</span>
                      <select
                        value={editor.trainerId}
                        onChange={(event) => setEditor({ ...editor, trainerId: event.target.value })}
                        className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select trainer</option>
                        {trainers.map((trainer) => (
                          <option key={trainer.user_id} value={trainer.user_id}>
                            {trainer.first_name} {trainer.last_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm text-muted-foreground">Trainer Add-on Price Per Month</span>
                      <input
                        type="number"
                        value={editor.trainerAddonPrice}
                        onChange={(event) => setEditor({ ...editor, trainerAddonPrice: event.target.value })}
                        placeholder="Set monthly trainer pricing"
                        className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard
                  icon={<CalendarClock className="h-5 w-5 text-primary" />}
                  label="Plan Price"
                  value={`Rs ${Number(pricingPreview?.planPrice || 0).toLocaleString('en-IN')}`}
                />
                <SummaryCard
                  icon={<UserRound className="h-5 w-5 text-yellow-500" />}
                  label="Trainer Add-on Total"
                  value={`Rs ${Number(pricingPreview?.addonTotalPrice || 0).toLocaleString('en-IN')}`}
                  note={selectedPlan ? `Rs ${Number(pricingPreview?.addonMonthlyPrice || 0).toLocaleString('en-IN')}/month x ${selectedPlan.duration_months} month${selectedPlan.duration_months > 1 ? 's' : ''}` : undefined}
                />
                <SummaryCard
                  icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
                  label="Total"
                  value={`Rs ${Number(pricingPreview?.totalPrice || 0).toLocaleString('en-IN')}`}
                />
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                <p className="font-medium text-red-500">Terminate subscription</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use this when a member subscription must be stopped for misconduct or other administrative reasons.
                </p>
                <div className="mt-4 flex gap-3">
                  <input
                    value={terminationReason}
                    onChange={(event) => setTerminationReason(event.target.value)}
                    placeholder="Termination reason"
                    className="flex-1 rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={terminateSubscription}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-3 text-red-500 hover:bg-red-500/10"
                  >
                    <Ban className="h-4 w-4" />
                    Terminate
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={renewSubscription}
                  className="rounded-xl border border-primary/30 px-4 py-3 text-primary hover:bg-primary/10"
                >
                  Renew
                </button>
                <button
                  type="button"
                  onClick={() => setEditor(null)}
                  className="rounded-xl border border-border px-4 py-3 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-3 text-primary-foreground hover:bg-primary/90"
                >
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-3">
        {icon}
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-xl font-semibold">{value}</p>
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
