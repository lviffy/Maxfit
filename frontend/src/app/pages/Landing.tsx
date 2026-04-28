import { Link } from 'react-router';
import { Dumbbell, Users, Calendar, TrendingUp, MapPin, Mail, Phone, Facebook, Instagram, Twitter } from 'lucide-react';
import { motion } from 'motion/react';

export default function Landing() {
  const coreFeatures = [
    { icon: Users, title: 'Expert Coaching', desc: 'Certified trainers with personalized guidance and accountability.' },
    { icon: Calendar, title: 'Smart Scheduling', desc: 'Book sessions easily and stay consistent with structured routines.' },
    { icon: TrendingUp, title: 'Progress Insights', desc: 'Track performance, body metrics, and milestones in one place.' },
  ];

  const highlights = [
    'Personalized workout plans',
    'Custom nutrition guidance',
    'Attendance and performance tracking',
    'Trainer and admin support',
    'Flexible class and session scheduling',
    'Member-first dashboard experience',
  ];

  return (
    <div className="min-h-screen bg-background">
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&h=1080&fit=crop"
            alt="Gym"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/45" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-white w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-4xl"
          >
            <p className="uppercase tracking-[0.22em] text-xs md:text-sm text-white/70 mb-5">
              Max Fit Performance Club
            </p>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-[1.05]">
              Train Smarter.
              <br />
              <span className="text-primary">Perform Better.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl leading-relaxed">
              A focused gym platform for members, trainers, and admins to plan workouts, track progress, and stay aligned.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-7 py-3.5 bg-primary text-white rounded-lg font-medium transition-all"
                >
                  Join as Member
                </motion.button>
              </Link>
              <Link to="/register/employee">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-7 py-3.5 bg-white/10 backdrop-blur-sm text-white border border-white/25 rounded-lg font-medium hover:bg-white/20 transition-all"
                >
                  Join as Employee
                </motion.button>
              </Link>
              <Link to="/login">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-7 py-3.5 bg-transparent text-white border border-white/40 rounded-lg font-medium hover:bg-white/10 transition-all"
                >
                  Login
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 px-6 bg-card">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Everything You Need To Stay Consistent</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Max Fit brings coaching, scheduling, and progress tracking into one streamlined experience.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {coreFeatures.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -3 }}
                className="p-7 rounded-xl bg-background border border-border transition-all"
              >
                <item.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center rounded-2xl border border-border bg-card p-8 md:p-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <img
                src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=600&fit=crop"
                alt="Training"
                className="rounded-2xl"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-5"
            >
              <h2 className="text-3xl md:text-4xl font-bold">What You Get At Max Fit</h2>
              <p className="text-muted-foreground leading-relaxed">
                A practical system that helps you stay focused on training outcomes instead of scattered tools.
              </p>
              {highlights.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <p className="text-base md:text-lg">{item}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-card">
        <div className="max-w-7xl mx-auto">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-4xl md:text-5xl font-bold text-center mb-14">
            Built For Every Role
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Dumbbell, title: 'Strength Training', desc: 'Build muscle and power' },
              { icon: TrendingUp, title: 'Progress Analytics', desc: 'Track every metric' },
              { icon: Calendar, title: 'Smart Scheduling', desc: 'Never miss a session' },
              { icon: Users, title: 'Community', desc: 'Connect with members' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="p-6 rounded-xl bg-background border border-border transition-all"
              >
                <item.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-primary text-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-5">Ready To Start?</h2>
            <p className="text-lg md:text-xl mb-9 opacity-90">
              Build momentum with a gym platform designed for real consistency.
            </p>
            <Link to="/register">
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="px-9 py-4 bg-white text-primary rounded-lg font-semibold text-lg transition-all"
              >
                Get Started Today
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="py-16 px-6 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-2xl font-bold mb-4 text-primary">Max Fit</h3>
            <p className="text-muted-foreground">
              Premium gym management for the modern fitness enthusiast.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <div className="space-y-3 text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>123 Fitness Street, City 12345</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>info@gymflow.com</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Follow Us</h4>
            <div className="flex gap-4">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all"
                >
                  <Icon className="w-5 h-5" />
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-border text-center text-muted-foreground">
          <p>&copy; 2026 Max Fit. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
