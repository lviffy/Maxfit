import { Link } from 'react-router';
import { User, Briefcase } from 'lucide-react';
import { motion } from 'motion/react';

export default function RoleSelection() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-3">Join GymFlow</h1>
          <p className="text-muted-foreground">Select your role to get started</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link to="/register/member">
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-12 rounded-2xl bg-card border-2 border-border hover:border-primary transition-all cursor-pointer group"
            >
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all">
                  <User className="w-10 h-10 text-primary group-hover:text-white transition-colors" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Member</h2>
                <p className="text-muted-foreground">
                  Access workouts, track progress, and connect with trainers
                </p>
              </div>
            </motion.div>
          </Link>

          <Link to="/register/employee">
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-12 rounded-2xl bg-card border-2 border-border hover:border-primary transition-all cursor-pointer group"
            >
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all">
                  <Briefcase className="w-10 h-10 text-primary group-hover:text-white transition-colors" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Employee</h2>
                <p className="text-muted-foreground">
                  Join our team as a trainer or admin
                </p>
              </div>
            </motion.div>
          </Link>
        </div>

        <div className="text-center mt-8">
          <Link to="/login" className="text-primary hover:underline">
            Already have an account? Login
          </Link>
        </div>
      </div>
    </div>
  );
}
