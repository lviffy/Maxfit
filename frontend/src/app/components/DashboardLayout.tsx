import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  CreditCard,
  Activity,
  Calendar,
  TrendingUp,
  Award,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  children: ReactNode;
  title: string;
}

export default function DashboardLayout({ children, title }: Props) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const baseMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['member'] },
    { icon: Users, label: 'Members', path: '/members', roles: ['admin', 'owner'] },
    { icon: Users, label: 'Employees', path: '/employees', roles: ['owner'] },
    { icon: Dumbbell, label: 'Trainer Panel', path: '/trainer', roles: ['trainer'] },
    { icon: CreditCard, label: 'Payments', path: '/payments', roles: ['member'] },
    { icon: Activity, label: 'Workouts', path: '/workouts', roles: ['member'] },
    { icon: Calendar, label: 'Attendance', path: '/attendance', roles: ['member', 'trainer', 'admin', 'owner'] },
    { icon: TrendingUp, label: 'Progress', path: '/progress', roles: ['member'] },
    { icon: Calendar, label: 'Schedule', path: '/schedule', roles: ['member', 'trainer'] },
    { icon: Award, label: 'Badges', path: '/badges', roles: ['member'] },
  ];

  const menuItems = baseMenuItems.filter(item => item.roles.includes(user?.role || ''));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 20 }}
            className="w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0 fixed h-full z-40 lg:relative flex flex-col"
          >
            <div className="p-6 border-b border-sidebar-border shrink-0">
              <Link to="/">
                <h1 className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors">GymFlow</h1>
              </Link>
              <p className="text-sm text-sidebar-foreground/60 mt-1">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-sidebar-foreground/40 capitalize">{user?.role}</p>
            </div>

            <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-sidebar-border shrink-0 bg-sidebar">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground transition-all w-full"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-primary" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
