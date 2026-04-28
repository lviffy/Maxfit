import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { motion } from 'motion/react';
import { Calendar, TrendingUp, Award, User, Dumbbell, Apple } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export default function MemberDashboard() {
  const { user } = useAuth();
  const [workout, setWorkout] = useState<any>(null);
  const [meal, setMeal] = useState<any>(null);
  const [memberDetails, setMemberDetails] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [progressHistory, setProgressHistory] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) fetchDashboardData();
  }, [user?.id]);

  const fetchDashboardData = async () => {
    try {
      const [plansRes, memberRes, attendanceRes, progressRes, badgesRes, paymentsRes] = await Promise.all([
        api.get('/api/member/plans'),
        api.get(`/member-details/${user?.id}`),
        api.get(`/attendance-percentage/${user?.id}`),
        api.get(`/get-progress/${user?.id}`),
        api.get(`/get-badges/${user?.id}`),
        api.get(`/api/member/payments/${user?.id}`),
      ]);

      setWorkout(plansRes.data?.workout || null);
      setMeal(plansRes.data?.meal || null);
      setMemberDetails(memberRes.data || null);
      setAttendance(attendanceRes.data || null);
      setProgressHistory(progressRes.data?.history || []);
      setBadges(badgesRes.data?.badges || []);
      setPayments(paymentsRes.data?.payments || []);
    } catch (e) {
      console.error('Could not load member dashboard data.', e);
    }
  };

  const latestProgress = progressHistory.length ? progressHistory[progressHistory.length - 1] : null;
  const firstProgress = progressHistory.length ? progressHistory[0] : null;
  const weightDelta = latestProgress && firstProgress ? (Number(latestProgress.weight) - Number(firstProgress.weight)) : 0;
  const chartData = progressHistory.map((p) => ({
    month: p.date ? new Date(p.date).toLocaleDateString(undefined, { month: 'short' }) : '',
    weight: Number(p.weight),
  }));

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
            <p className="text-2xl font-bold capitalize">{memberDetails?.membership_status || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {typeof memberDetails?.remaining_days === 'number' ? `${memberDetails.remaining_days} days remaining` : 'No expiry data'}
            </p>
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
            <p className="text-2xl font-bold">{attendance?.attendance_percentage ?? 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">{attendance?.days_present ?? 0} present / {attendance?.days_marked ?? 0} days</p>
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
            <p className="text-2xl font-bold">{latestProgress ? `${latestProgress.weight} kg` : 'N/A'}</p>
            <p className={`text-xs mt-1 ${weightDelta <= 0 ? 'text-green-500' : 'text-amber-500'}`}>
              {latestProgress && firstProgress ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg from start` : 'No progress records yet'}
            </p>
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
            <p className="text-2xl font-bold">{badges.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Earned</p>
          </motion.div>
        </div>

        {/* Assigned Plans */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Workout Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-xl bg-card border border-border"
          >
            <div className="flex items-center gap-3 mb-4">
              <Dumbbell className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-semibold">Workout Plan</h3>
            </div>
            <div className="space-y-3">
              {workout ? (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {workout.workout_details || "No details provided"}
                  </p>
                  {workout.suggestion && (
                    <div className="mt-3 pt-3 border-t border-primary/20">
                      <p className="text-xs font-medium text-primary mb-1">Trainer's Note</p>
                      <p className="text-sm text-muted-foreground">{workout.suggestion}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground text-center py-4">No workout plan assigned yet.</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Meal Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-6 rounded-xl bg-card border border-border"
          >
            <div className="flex items-center gap-3 mb-4">
              <Apple className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-semibold">Meal Plan</h3>
            </div>
            <div className="space-y-3">
              {meal ? (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {meal.meal_details || "No details provided"}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground text-center py-4">No meal plan assigned yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Progress Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-6 rounded-xl bg-card border border-border"
        >
          <h3 className="text-lg font-semibold mb-6">Weight Progress</h3>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
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
          ) : (
            <p className="text-sm text-muted-foreground">No progress history available yet.</p>
          )}
        </motion.div>

        {/* Badges & Payments */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="p-6 rounded-xl bg-card border border-border"
          >
            <h3 className="text-lg font-semibold mb-4">Badges</h3>
            <div className="space-y-3">
              {badges.length ? badges.map((badge, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <span className="text-2xl">🏅</span>
                  <div>
                    <span className="font-medium block">{badge.badge_name}</span>
                    <span className="text-xs text-muted-foreground">Awarded: {badge.date_awarded}</span>
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">No badges earned yet.</p>}
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
              {payments.length ? payments.map((payment) => (
                <div key={payment.payment_id} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium capitalize">{payment.payment_mode} payment</p>
                    <p className="text-xs text-muted-foreground">{payment.payment_date}</p>
                  </div>
                  <p className="font-bold text-green-500">${payment.amount}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">No payments recorded yet.</p>}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
