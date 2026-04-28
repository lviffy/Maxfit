import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { DollarSign, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';

export default function Payments() {
  const [budget, setBudget] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/api/budget');
        setBudget(res.data || null);
      } catch (e) {
        console.error('Failed to load payment metrics', e);
      }
    };
    load();
  }, []);

  const revenueData = useMemo(
    () => (budget?.monthly_trend || []).map((item: any) => ({ month: item.month, revenue: item.revenue || 0 })),
    [budget]
  );

  const thisMonthRevenue = revenueData.length ? Number(revenueData[revenueData.length - 1].revenue || 0) : 0;
  const pendingRevenue = (budget?.recent_subscriptions || []).reduce(
    (sum: number, item: any) => sum + ((item.status || '').toLowerCase() !== 'active' ? Number(item.total_price || 0) : 0),
    0
  );

  return (
    <DashboardLayout title="Payments">
      <div className="space-y-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
            <p className="text-3xl font-bold">${Number(budget?.total_revenue || 0).toLocaleString()}</p>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <p className="text-sm text-muted-foreground">This Month</p>
            </div>
            <p className="text-3xl font-bold">${thisMonthRevenue.toLocaleString()}</p>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-yellow-500" />
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <p className="text-3xl font-bold">${pendingRevenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-card border border-border">
          <h3 className="text-lg font-semibold mb-6">Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
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
    </DashboardLayout>
  );
}
