import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { motion } from 'motion/react';
import { Calendar, TrendingUp, Award, CreditCard, User, Dumbbell } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export default function MemberDashboard() {
  const { user } = useAuth();
  const [diet, setDiet] = useState<string>("Loading recommendation...");

  useEffect(() => {
    if (user?.id) fetchDiet();
  }, [user?.id]);

  const fetchDiet = async () => {
    try {
      const res = await api.get(`/diet/${user?.id}`);
      if (res.data?.diet_recommendation) {
        setDiet(res.data.diet_recommendation);
      }
    } catch (e) {
      setDiet("Could not load diet recommendation.");
    }
  };
  const weightData = [
    { month: 'Jan', weight: 85 },
    { month: 'Feb', weight: 83 },
    { month: 'Mar', weight: 81 },
    { month: 'Apr', weight: 79 },
  ];

  const badges = [
    { name: '30 Day Streak', icon: '🔥', earned: true },
    { name: 'Weight Loss Champion', icon: '🏆', earned: true },
    { name: '100 Workouts', icon: '💪', earned: false },
  ];

  return (
    <DashboardLayout title="My Dashboard">
      <div className="space-y-6">
        {/* Profile Summary */}
        <div className="grid md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-xl bg-card border border-border"
          >
            <div className="flex items-center gap-3 mb-2">
              <User className="w-5 h-5 text-primary" />
              <p className="text-sm text-muted-foreground">Membership</p>
            </div>
            <p className="text-2xl font-bold">Active</p>
            <p className="text-xs text-muted-foreground mt-1">94 days remaining</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-xl bg-card border border-border"
          >
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-primary" />
              <p className="text-sm text-muted-foreground">Attendance</p>
            </div>
            <p className="text-2xl font-bold">85%</p>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-xl bg-card border border-border"
          >
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <p className="text-sm text-muted-foreground">Weight</p>
            </div>
            <p className="text-2xl font-bold">79 kg</p>
            <p className="text-xs text-green-500 mt-1">-6 kg from start</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-xl bg-card border border-border"
          >
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-5 h-5 text-primary" />
              <p className="text-sm text-muted-foreground">Badges</p>
            </div>
            <p className="text-2xl font-bold">2/3</p>
            <p className="text-xs text-muted-foreground mt-1">Earned</p>
          </motion.div>
        </div>

        {/* Progress Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-xl bg-card border border-border"
        >
          <h3 className="text-lg font-semibold mb-6">Weight Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={weightData}>
              <defs>
                <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Area
                type="monotone"
                dataKey="weight"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#weightGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Badges & Schedule */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-6 rounded-xl bg-card border border-border"
          >
            <h3 className="text-lg font-semibold mb-4">Badges</h3>
            <div className="space-y-3">
              {badges.map((badge, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    badge.earned ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50 opacity-50'
                  }`}
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <span className="font-medium">{badge.name}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-6 rounded-xl bg-card border border-border"
          >
            <h3 className="text-lg font-semibold mb-4">Today's Schedule</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Dumbbell className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Upper Body Workout</p>
                  <p className="text-xs text-muted-foreground">10:00 AM - 11:00 AM</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Trainer Session</p>
                  <p className="text-xs text-muted-foreground">2:00 PM - 3:00 PM</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Diet & Payments */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="p-6 rounded-xl bg-card border border-border"
          >
            <h3 className="text-lg font-semibold mb-4">Diet Recommendation</h3>
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="font-medium text-primary mb-1">Your Customized Plan</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{diet}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="p-6 rounded-xl bg-card border border-border"
          >
            <h3 className="text-lg font-semibold mb-4">Payment History</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Membership Fee</p>
                  <p className="text-xs text-muted-foreground">Jan 15, 2026</p>
                </div>
                <p className="font-bold text-green-500">$1200</p>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Personal Training</p>
                  <p className="text-xs text-muted-foreground">Feb 1, 2026</p>
                </div>
                <p className="font-bold text-green-500">$300</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
