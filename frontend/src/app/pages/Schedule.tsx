import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Calendar, Clock, Plus, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { toast } from 'sonner';

export default function Schedule() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [trainerId, setTrainerId] = useState('');

  useEffect(() => {
    if (user?.id) fetchSchedule();
  }, [user?.id]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/get-schedule/${user?.id}`);
      if (res.data?.schedules) {
        // Group by Date instead of static Days since we use real YYYY-MM-DD
        const grouped = res.data.schedules.reduce((acc: any, curr: any) => {
          if (!acc[curr.date]) acc[curr.date] = [];
          acc[curr.date].push(curr);
          return acc;
        }, {});
        
        const formatted = Object.keys(grouped).map(k => ({
          day: k,
          sessions: grouped[k]
        }));
        setSchedule(formatted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/request-slot', {
        user_id: user?.id,
        trainer_id: trainerId,
        date,
        time
      });
      toast.success('Slot requested!');
      fetchSchedule();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to request slot');
    }
  };

  const handleApprove = async (scheduleId: number) => {
    try {
      await api.put(`/approve-slot/${scheduleId}`);
      toast.success('Approved!');
      fetchSchedule();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to approve slot');
    }
  };

  return (
    <DashboardLayout title="Schedule">
      <div className="space-y-6">
        
        {user?.role === 'member' && (
           <div className="bg-card rounded-xl border border-border p-6 mb-6">
             <h3 className="font-medium mb-4">Request New Slot</h3>
             <form onSubmit={handleRequestSlot} className="flex flex-wrap items-end gap-4">
               <div className="flex-1 min-w-[200px]">
                 <label className="block text-xs mb-1 text-muted-foreground">Trainer ID</label>
                 <input type="number" required value={trainerId} onChange={e=>setTrainerId(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-input border-border focus:outline-none" />
               </div>
               <div className="flex-1 min-w-[200px]">
                 <label className="block text-xs mb-1 text-muted-foreground">Date YYYY-MM-DD</label>
                 <input type="text" placeholder="2026-05-01" required value={date} onChange={e=>setDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-input border-border focus:outline-none" />
               </div>
               <div className="flex-1 min-w-[200px]">
                 <label className="block text-xs mb-1 text-muted-foreground">Time</label>
                 <input type="text" placeholder="10:00 AM" required value={time} onChange={e=>setTime(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-input border-border focus:outline-none" />
               </div>
               <button type="submit" disabled={loading} className="px-6 py-2 bg-primary text-white rounded-lg flex items-center font-medium min-h-[42px] hover:bg-primary/90">
                 <Plus className="w-4 h-4 mr-2" />
                 Request
               </button>
             </form>
           </div>
        )}

        {schedule.length === 0 && !loading && (
          <p className="text-muted-foreground text-sm">No scheduled sessions found.</p>
        )}

        {schedule.map((day, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-6 rounded-xl bg-card border border-border"
          >
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">{day.day}</h3>
            </div>
            <div className="space-y-3">
              {day.sessions.map((session: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border/50">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Session #{session.schedule_id} - <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${session.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{session.status}</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Trainer ID: {session.trainer_id} | Member ID: {session.user_id}</p>
                  </div>
                  <span className="text-sm font-medium pr-4 border-r border-border my-2">{session.time}</span>
                  
                  {user?.role === 'trainer' && session.status === 'pending' && (
                    <button onClick={() => handleApprove(session.schedule_id)} className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
}
