import DashboardLayout from '../components/DashboardLayout';
import { Dumbbell, Play } from 'lucide-react';
import { motion } from 'motion/react';

export default function Workouts() {
  const workouts = [
    { name: 'Upper Body Strength', duration: '45 min', difficulty: 'Advanced', exercises: 8 },
    { name: 'Cardio Blast', duration: '30 min', difficulty: 'Intermediate', exercises: 6 },
    { name: 'Core & Abs', duration: '20 min', difficulty: 'Beginner', exercises: 10 },
    { name: 'Full Body HIIT', duration: '40 min', difficulty: 'Advanced', exercises: 12 },
  ];

  return (
    <DashboardLayout title="Workout Library">
      <div className="grid md:grid-cols-2 gap-6">
        {workouts.map((workout, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4 }}
            className="p-6 rounded-xl bg-card border border-border transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{workout.name}</h3>
                  <p className="text-sm text-muted-foreground">{workout.exercises} exercises</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
              <span>{workout.duration}</span>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full">
                {workout.difficulty}
              </span>
            </div>
            <button className="w-full py-3 bg-primary text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/50 transition-all">
              <Play className="w-4 h-4" />
              Start Workout
            </button>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
}
