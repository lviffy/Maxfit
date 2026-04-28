import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Users, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';

export default function Owner() {
  const [budget, setBudget] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/api/budget');
        setBudget(res.data || null);
      } catch (e) {
        console.error('Failed to load owner metrics', e);
      }
    };
    load();
  }, []);

  const monthlyData = useMemo(() => (budget?.monthly_trend || []).map((item: any) => ({
    month: item.month,
    members: item.subscriptions || 0,
    revenue: item.revenue || 0,
  })), [budget]);

  const stats = [
    { label: 'Total Members', value: String(budget?.total_members ?? 0), note: `${budget?.active_members ?? 0} active`, icon: Users, color: 'text-blue-500' },
    { label: 'Total Revenue', value: `$${Number(budget?.total_revenue ?? 0).toLocaleString()}`, note: 'Active subscriptions', icon: DollarSign, color: 'text-green-500' },
    { label: 'Trainer Add-on Revenue', value: `$${Number(budget?.addon_revenue ?? 0).toLocaleString()}`, note: 'Add-on contribution', icon: Activity, color: 'text-purple-500' },
    { label: 'Plan Revenue', value: `$${Number(budget?.plan_revenue ?? 0).toLocaleString()}`, note: 'Base plan collection', icon: TrendingUp, color: 'text-orange-500' },
  ];

  return (
    <DashboardLayout title="Owner Dashboard">
      <div className="space-y-6">
        <div className="grid md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="p-6 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.note}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-card border border-border">
            <h3 className="text-lg font-semibold mb-6">Member Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="members" stroke="var(--color-primary)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <h3 className="text-lg font-semibold mb-6">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="revenue" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
