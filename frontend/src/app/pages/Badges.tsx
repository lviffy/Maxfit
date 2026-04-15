import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Award } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export default function Badges() {
  const { user } = useAuth();
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) fetchBadges();
  }, [user?.id]);

  const fetchBadges = async () => {
    try {
      const res = await api.get(`/get-badges/${user?.id}`);
      if (res.data?.badges) {
        setEarnedBadges(res.data.badges);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const defaultBadges = [
    { name: '7 Day Streak', icon: '🔥', desc: 'Attend gym for 7 consecutive days' },
    { name: 'Consistency King', icon: '👑', desc: 'Attend gym 5 days a week for a month' },
    { name: 'Weight Loss Champion', icon: '🏆', desc: 'Lose 5kg' },
    { name: 'Strength Master', icon: '🏋️', desc: 'Lift 2x your body weight' },
  ];

  const badges = defaultBadges.map(badge => {
    const earned = earnedBadges.find(eb => eb.badge_name === badge.name);
    return {
      ...badge,
      earned: !!earned,
      date_awarded: earned?.date_awarded
    };
  });


  return (
    <DashboardLayout title="Badges">
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold">Your Achievement Progress</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            You've earned {badges.filter(b => b.earned).length} out of {badges.length} badges
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {badges.map((badge, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className={`p-6 rounded-xl border transition-all ${
                badge.earned
                  ? 'bg-primary/10 border-primary/30 shadow-lg'
                  : 'bg-card border-border opacity-60'
              }`}
            >
              <div className="text-center">
                <div className="text-5xl mb-3">{badge.icon}</div>
                <h3 className="font-semibold mb-2">{badge.name}</h3>
                <p className="text-sm text-muted-foreground">{badge.desc}</p>
                {badge.earned && (
                  <div className="mt-4 px-3 py-1 bg-primary text-white rounded-full text-xs font-medium inline-block">
                    Earned
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
