import DashboardLayout from '../components/DashboardLayout';
import { Users, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Owner() {
  const stats = [
    { label: 'Total Members', value: '248', change: '+12%', icon: Users, color: 'text-blue-500' },
    { label: 'Monthly Revenue', value: '$19,000', change: '+8%', icon: DollarSign, color: 'text-green-500' },
    { label: 'Active Trainers', value: '12', change: '+2', icon: Activity, color: 'text-purple-500' },
    { label: 'Growth Rate', value: '15%', change: '+3%', icon: TrendingUp, color: 'text-orange-500' },
  ];

  const monthlyData = [
    { month: 'Jan', members: 220, revenue: 15000 },
    { month: 'Feb', members: 230, revenue: 18000 },
    { month: 'Mar', members: 240, revenue: 22000 },
    { month: 'Apr', members: 248, revenue: 19000 },
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
              <p className="text-sm text-green-500 mt-1">{stat.change}</p>
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
