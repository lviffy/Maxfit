import DashboardLayout from '../components/DashboardLayout';
import { motion } from 'motion/react';
import { Dumbbell, Apple } from 'lucide-react';

export default function TrainerPanel() {
  const assignedMembers = [
    { id: 1, name: 'John Doe', regNo: 'GM001', goal: 'Weight Loss', progress: 65 },
    { id: 2, name: 'Sarah Smith', regNo: 'GM002', goal: 'Muscle Gain', progress: 78 },
    { id: 3, name: 'Michael Brown', regNo: 'GM003', goal: 'Strength', progress: 45 },
  ];

  return (
    <DashboardLayout title="Trainer Panel">
      <div className="space-y-6">
        <div className="grid gap-6">
          {assignedMembers.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="p-6 rounded-xl bg-card border border-border transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {member.regNo} • {member.goal}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="text-2xl font-bold text-primary">{member.progress}%</p>
                </div>
              </div>

              <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${member.progress}%` }}
                  transition={{ duration: 1, delay: index * 0.1 }}
                  className="h-full bg-primary"
                />
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/50 transition-all"
                >
                  <Dumbbell className="w-4 h-4" />
                  Update Workout
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-3 bg-card border border-border text-foreground rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-accent transition-all"
                >
                  <Apple className="w-4 h-4" />
                  Update Meal
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
