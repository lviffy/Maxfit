import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { toast } from 'sonner';

export default function Progress() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [weight, setWeight] = useState('');
  const [bmi, setBmi] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchProgress();
  }, [user?.id]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/get-progress/${user?.id}`);
      if (response.data?.history) {
        // Map history to graph format
        const formatted = response.data.history.map((record: any) => ({
          week: record.date, // Use date as X axis directly
          weight: record.weight,
          bmi: record.bmi
        }));
        setData(formatted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || !bmi) return;
    try {
      await api.post('/add-progress', {
        user_id: user?.id,
        weight: parseFloat(weight),
        bmi: parseFloat(bmi)
      });
      toast.success('Progress saved securely!');
      setWeight('');
      setBmi('');
      fetchProgress();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to save progress.');
    }
  };

  const latest = data.length > 0 ? data[data.length - 1] : null;
  const previous = data.length > 1 ? data[data.length - 2] : null;
  
  const weightDiff = latest && previous ? (latest.weight - previous.weight).toFixed(1) : 0;
  const bmiDiff = latest && previous ? (latest.bmi - previous.bmi).toFixed(1) : 0;

  return (
    <DashboardLayout title="Progress Tracking">
      <div className="space-y-6">
      
        <div className="bg-card rounded-xl border border-border p-6 flex flex-wrap gap-4 items-end">
          <form onSubmit={handleAddProgress} className="flex gap-4 items-end w-full">
            <div className="flex-1">
              <label className="block text-sm mb-2 text-muted-foreground">Logged Weight (kg)</label>
              <input type="number" step="0.1" required value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:outline-none" />
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-2 text-muted-foreground">Logged BMI</label>
              <input type="number" step="0.1" required value={bmi} onChange={(e) => setBmi(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:outline-none" />
            </div>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 min-h-[42px] flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Add Record
            </button>
          </form>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <div className="p-6 rounded-xl bg-card border border-border">
            <p className="text-sm text-muted-foreground mb-2">Current Weight</p>
            <p className="text-3xl font-bold">{latest ? latest.weight : '-'} kg</p>
            {latest && previous && (
              <div className={`flex items-center gap-1 text-sm mt-1 ${Number(weightDiff) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {Number(weightDiff) > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{Number(weightDiff) > 0 ? '+' : ''}{weightDiff} kg</span>
              </div>
            )}
          </div>
          <div className="p-6 rounded-xl bg-card border border-border">
            <p className="text-sm text-muted-foreground mb-2">Current BMI</p>
            <p className="text-3xl font-bold">{latest ? latest.bmi : '-'}</p>
            {latest && previous && (
               <div className={`flex items-center gap-1 text-sm mt-1 ${Number(bmiDiff) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                 {Number(bmiDiff) > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                 <span>{Number(bmiDiff) > 0 ? '+' : ''}{bmiDiff}</span>
               </div>
            )}
          </div>
          <div className="p-6 rounded-xl bg-card border border-border">
            <p className="text-sm text-muted-foreground mb-2">Goal Weight</p>
            <p className="text-3xl font-bold">75 kg</p>
            <p className="text-xs text-muted-foreground mt-1">N/A to go</p>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border">
            <p className="text-sm text-muted-foreground mb-2">Entries</p>
            <p className="text-3xl font-bold text-primary">{data.length}</p>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-card border border-border">
          <h3 className="text-lg font-semibold mb-6">Progress Over Time</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="week" stroke="var(--color-muted-foreground)" />
              <YAxis yAxisId="left" stroke="var(--color-muted-foreground)" />
              <YAxis yAxisId="right" orientation="right" stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="weight"
                stroke="var(--color-primary)"
                strokeWidth={2}
                name="Weight (kg)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bmi"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                name="BMI"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  );
}
