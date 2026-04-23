import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { BadgeIndianRupee, CalendarClock, History, RotateCw, UserRound, CheckCircle2 } from 'lucide-react';
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

interface EditorState {
  memberId: number;
  memberName: string;
  planCode: string;
  trainerAddonEnabled: boolean;
  trainerId: string;
  trainerAddonPrice: string;
}


interface Member {
  member_id: number;
  reg_no: string;
  first_name: string;
  last_name: string;
  email: string;
  membership_status: string;
}

interface Subscription {
  plan_name?: string | null;
  duration_months?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  total_price?: number | null;
  trainer_name?: string | null;
  trainer_addon_monthly_price?: number | null;
  trainer_addon_price?: number | null;
  subscription_id?: number | null;
  status?: string | null;
  action_type?: string | null;
  note?: string | null;
  created_at?: string | null;
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '-';
  return dateString.split('T')[0];
}

function calculateDaysRemaining(endDate?: string | null) {
  if (!endDate) return '-';
  const end = new Date(endDate.split('T')[0]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? `${diffDays} days` : 'Expired';
}

export default function SubscriptionMemberProfile() {
  const { memberId } = useParams();
  const [member, setMember] = useState<Member | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);

  useEffect(() => {
    fetchDetails();
  }, [memberId]);

  const fetchDetails = async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const [configResponse, profileResponse] = await Promise.all([
        api.get('/subscription-config'),
        api.get(`/subscriptions/member/${memberId}`),
      ]);
      setPlans(configResponse.data?.plans || []);
      setTrainers(configResponse.data?.trainers || []);
      
      setMember(profileResponse.data?.member || null);
      setCurrentSubscription(profileResponse.data?.current_subscription || null);
      setHistory(profileResponse.data?.history || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load subscription profile');
    } finally {
      setLoading(false);
    }
  };

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

  const openEditor = () => {
    if (!member) return;
    setEditor({
      memberId: member.member_id,
      memberName: `${member.first_name} ${member.last_name}`.trim(),
      planCode: currentSubscription?.plan_code || 'monthly',
      trainerAddonEnabled: Boolean(currentSubscription?.trainer_addon_enabled),
      trainerId: currentSubscription?.trainer_id ? String(currentSubscription.trainer_id) : '',
      trainerAddonPrice: currentSubscription?.trainer_addon_monthly_price ? String(currentSubscription.trainer_addon_monthly_price) : '',
    });
  };

  const handleRenew = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editor) return;
    try {
      setRenewing(true);
      await api.post(`/subscriptions/renew/${editor.memberId}`, {
        plan_code: editor.planCode,
        trainer_addon_enabled: editor.trainerAddonEnabled,
        trainer_id: editor.trainerAddonEnabled ? editor.trainerId || null : null,
        trainer_addon_monthly_price: editor.trainerAddonEnabled ? Number(editor.trainerAddonPrice || 0) : 0,
      });
      toast.success('Subscription renewed successfully');
      setEditor(null);
      fetchDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to renew subscription');
    } finally {
      setRenewing(false);
    }
  };

  return (
    <DashboardLayout title="Subscription Profile">
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <Link to="/subscriptions" className="text-sm text-muted-foreground hover:text-foreground">
            Back to subscriptions
          </Link>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">
                {member ? `${member.first_name} ${member.last_name}` : 'Member subscription'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {member ? `${member.reg_no} - ${member.email}` : 'Loading member profile...'}
              </p>
            </div>
            <button
              onClick={openEditor}
              disabled={!currentSubscription}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCw className="h-4 w-4" />
              {renewing ? 'Renewing...' : 'Renew Subscription'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <InfoCard
            icon={<BadgeIndianRupee className="h-5 w-5 text-primary" />}
            label="Current Plan"
            value={currentSubscription?.plan_name || 'Not assigned'}
          />
          <InfoCard
            icon={<CalendarClock className="h-5 w-5 text-green-500" />}
            label="Current Period"
            value={currentSubscription?.start_date && currentSubscription?.end_date ? `${formatDate(currentSubscription.start_date)} to ${formatDate(currentSubscription.end_date)}` : 'Not assigned'}
          />
          <InfoCard
            icon={<BadgeIndianRupee className="h-5 w-5 text-yellow-500" />}
            label="Current Total"
            value={`Rs ${Number(currentSubscription?.total_price || 0).toLocaleString('en-IN')}`}
          />
          <InfoCard
            icon={<History className="h-5 w-5 text-blue-500" />}
            label="Purchases Logged"
            value={String(history.length)}
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">Current Subscription</h3>
          {currentSubscription ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <DetailRow label="Plan" value={currentSubscription.plan_name || '-'} />
              <DetailRow label="Status" value={currentSubscription.status || '-'} />
              <DetailRow label="Join Date" value={formatDate(currentSubscription.start_date)} />
              <DetailRow label="Expiry Date" value={formatDate(currentSubscription.end_date)} />
              <DetailRow label="Days Remaining" value={calculateDaysRemaining(currentSubscription.end_date)} />
              <DetailRow label="Trainer Add-on Monthly" value={`Rs ${Number(currentSubscription.trainer_addon_monthly_price || 0).toLocaleString('en-IN')}`} />
              <DetailRow label="Trainer Add-on Total" value={`Rs ${Number(currentSubscription.trainer_addon_price || 0).toLocaleString('en-IN')}`} />
              <DetailRow label="Trainer" value={currentSubscription.trainer_name || 'No add-on'} />
              <DetailRow label="Total Price" value={`Rs ${Number(currentSubscription.total_price || 0).toLocaleString('en-IN')}`} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No current subscription found.</p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-lg font-semibold">Plan Purchase History</h3>
            <p className="text-sm text-muted-foreground">Tracks every purchase, renewal, and termination for this member.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-4 text-left text-sm font-semibold">Action</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Plan</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Period</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Trainer Add-on</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Total</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, index) => (
                  <tr key={`${entry.subscription_id || index}-${entry.created_at || index}`} className="border-b border-border transition-colors hover:bg-muted/20">
                    <td className="px-6 py-4 text-sm capitalize">
                      {index === history.length - 1 ? 'First Purchase' : 'Renewed'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        {entry.plan_name || '-'}
                        {index === 0 && currentSubscription?.status === 'active' && (
                          <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-500">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {entry.start_date && entry.end_date ? `${formatDate(entry.start_date)} to ${formatDate(entry.end_date)}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      Rs {Number(entry.trainer_addon_monthly_price || 0).toLocaleString('en-IN')}/month
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      Rs {Number(entry.total_price || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{entry.note || '-'}</td>
                  </tr>
                ))}
                {history.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">
                      No subscription history found.
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
                <h3 className="text-xl font-semibold">Renew Subscription</h3>
                <p className="text-sm text-muted-foreground">{editor.memberName}</p>
              </div>
              <button
                onClick={() => setEditor(null)}
                className="rounded-xl border border-border px-4 py-2 hover:bg-muted"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleRenew} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-1">
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

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditor(null)}
                  className="rounded-xl border border-border px-4 py-3 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renewing}
                  className="rounded-xl bg-primary px-5 py-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {renewing ? 'Processing...' : 'Confirm Renewal'}
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

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 flex items-center gap-3">
        {icon}
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}
