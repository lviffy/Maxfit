import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Wallet, TrendingUp, Users, UserCheck, BadgeIndianRupee, Dumbbell } from 'lucide-react';
import { motion } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../services/api';
import { toast } from 'sonner';

interface PlanBreakdown {
  plan_name: string;
  member_count: number;
  revenue: number;
}

interface MonthlyTrend {
  month: string;
  revenue: number;
  subscriptions: number;
}

interface RecentSubscription {
  first_name: string;
  last_name: string;
  reg_no: string;
  plan_name: string;
  total_price: number;
  start_date: string;
  status: string;
}

interface BudgetData {
  total_revenue: number;
  active_members: number;
  total_members: number;
  addon_revenue: number;
  plan_revenue: number;
  plan_breakdown: PlanBreakdown[];
  monthly_trend: MonthlyTrend[];
  recent_subscriptions: RecentSubscription[];
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color = 'text-primary',
  bg = 'bg-primary/10',
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  bg?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className={`rounded-xl p-3 ${bg} ${color}`}>{icon}</div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}

export default function Budget() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudget();
  }, []);

  const fetchBudget = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/budget');
      setData(res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Budget & Financials">
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground animate-pulse">Loading financial data...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Budget & Financials">
        <p className="text-muted-foreground">No data available.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Budget & Financials">
      <div className="space-y-8">
        {/* Header */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Financial Overview</h2>
              <p className="text-sm text-muted-foreground">
                All income collected from active member subscriptions.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Wallet className="h-5 w-5" />}
            label="Total Revenue Collected"
            value={`Rs ${data.total_revenue.toLocaleString('en-IN')}`}
            sub="From all active subscriptions"
            delay={0}
          />
          <StatCard
            icon={<BadgeIndianRupee className="h-5 w-5" />}
            label="Plan Revenue"
            value={`Rs ${data.plan_revenue.toLocaleString('en-IN')}`}
            sub="Base subscription fees"
            color="text-green-500"
            bg="bg-green-500/10"
            delay={0.05}
          />
          <StatCard
            icon={<Dumbbell className="h-5 w-5" />}
            label="Personal Trainer Add-on Revenue"
            value={`Rs ${data.addon_revenue.toLocaleString('en-IN')}`}
            sub="From trainer add-on subscriptions"
            color="text-yellow-500"
            bg="bg-yellow-500/10"
            delay={0.1}
          />
          <StatCard
            icon={<UserCheck className="h-5 w-5" />}
            label="Active Members"
            value={String(data.active_members)}
            sub={`Out of ${data.total_members} total members`}
            color="text-blue-500"
            bg="bg-blue-500/10"
            delay={0.15}
          />
        </div>

        {/* Chart + Plan Breakdown */}
        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          {/* Monthly Trend */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <h3 className="mb-6 text-lg font-semibold">Monthly Revenue Trend</h3>
            {data.monthly_trend.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                Not enough data for trend chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.monthly_trend} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                      fontSize: '13px',
                    }}
                    formatter={(value: number) => [`Rs ${value.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue (Rs)" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Plan Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <h3 className="mb-6 text-lg font-semibold">Revenue by Plan</h3>
            {data.plan_breakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No plan data.</p>
            ) : (
              <div className="space-y-4">
                {data.plan_breakdown.map((plan, i) => (
                  <div key={i}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{plan.plan_name}</span>
                      <span className="text-muted-foreground">{plan.member_count} members</span>
                    </div>
                    <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{
                          width: data.total_revenue > 0
                            ? `${(plan.revenue / data.total_revenue) * 100}%`
                            : '0%',
                        }}
                      />
                    </div>
                    <p className="text-right text-xs text-muted-foreground">
                      Rs {plan.revenue.toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent Subscriptions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-lg font-semibold">Recent Subscriptions</h3>
            <p className="text-sm text-muted-foreground">Latest fee collection records.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left text-sm font-semibold">Member</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Reg No</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Plan</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Start Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_subscriptions.map((sub, i) => (
                  <tr key={i} className="border-b border-border transition-colors hover:bg-muted/20">
                    <td className="px-6 py-4 text-sm font-medium">{sub.first_name} {sub.last_name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{sub.reg_no}</td>
                    <td className="px-6 py-4 text-sm">{sub.plan_name}</td>
                    <td className="px-6 py-4 text-sm">{String(sub.start_date).split('T')[0]}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-500">
                      Rs {Number(sub.total_price).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        sub.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
