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

  return (
    <DashboardLayout title="Badges">
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold">Your Achievement Progress</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            You've earned {earnedBadges.length} badge{earnedBadges.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {earnedBadges.map((badge, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="p-6 rounded-xl border transition-all bg-primary/10 border-primary/30"
            >
              <div className="text-center">
                <div className="text-5xl mb-3">🏅</div>
                <h3 className="font-semibold mb-2">{badge.badge_name}</h3>
                <p className="text-sm text-muted-foreground">Awarded on {badge.date_awarded}</p>
                <div className="mt-4 px-3 py-1 bg-primary text-white rounded-full text-xs font-medium inline-block">
                  Earned
                </div>
              </div>
            </motion.div>
          ))}
          {earnedBadges.length === 0 && (
            <div className="col-span-full p-6 rounded-xl bg-card border border-border text-center text-muted-foreground">
              No badges earned yet.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
