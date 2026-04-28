import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  BadgeIndianRupee,
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
  Wallet,
  Megaphone,
} from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  children: ReactNode;
  title: string;
}

export default function DashboardLayout({ children, title }: Props) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);

  const baseMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['member'] },
    { icon: Users, label: 'Members', path: '/members', roles: ['admin', 'owner'] },
    { icon: UserPlus, label: 'Add Member', path: '/members/add', roles: ['admin', 'owner'] },
    { icon: BadgeIndianRupee, label: 'Subscriptions', path: '/subscriptions', roles: ['admin', 'owner'] },
    { icon: Users, label: 'Employees', path: '/employees', roles: ['owner'] },
    { icon: Dumbbell, label: 'Trainer Panel', path: '/trainer', roles: ['trainer'] },
    { icon: CreditCard, label: 'Payments', path: '/payments', roles: ['member'] },
    { icon: Activity, label: 'Workouts', path: '/workouts', roles: ['member'] },
    { icon: Calendar, label: 'Attendance', path: '/attendance', roles: ['member', 'trainer', 'admin', 'owner'] },
    { icon: TrendingUp, label: 'Progress', path: '/progress', roles: ['member'] },
    { icon: Calendar, label: 'Schedule', path: '/schedule', roles: ['member', 'trainer'] },
    { icon: Award, label: 'Badges', path: '/badges', roles: ['member'] },
    { icon: Wallet, label: 'Budget', path: '/budget', roles: ['admin', 'owner'] },
    { icon: Megaphone, label: 'Announcements', path: '/announcements', roles: ['member', 'trainer', 'admin', 'owner'] },
  ];

  const menuItems = baseMenuItems.filter(item => item.roles.includes(user?.role || ''));

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarClassName = isMobile
    ? `fixed inset-y-0 left-0 z-40 w-72 border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`
    : `fixed inset-y-0 left-0 z-40 w-72 border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`;
  const mainOffsetClassName = isMobile ? 'lg:ml-0' : sidebarOpen ? 'lg:ml-72' : 'lg:ml-0';

  const isPathActive = (path: string) => {
    if (path === '/members') {
      return location.pathname === '/members' || /^\/members\/\d+$/.test(location.pathname);
    }
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className={sidebarClassName}>
        <div className="flex h-full flex-col">
          <div className="border-b border-sidebar-border p-6">
            <Link to="/" className="block">
              <h1 className="text-2xl font-bold text-primary transition-all">
                Max Fit
              </h1>
            </Link>
            <>
              <p className="mt-3 text-sm text-sidebar-foreground/70">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs capitalize text-sidebar-foreground/45">{user?.role}</p>
            </>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto p-4">
            {menuItems.map((item) => {
              const isActive = isPathActive(item.path);
              return (
                <Link key={item.path} to={item.path}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    }`}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-sidebar-border p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sidebar-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`min-h-screen transition-[margin] duration-300 ease-out ${mainOffsetClassName}`}>
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
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
