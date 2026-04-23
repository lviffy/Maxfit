import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Calendar, CheckCircle, Clock3, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { toast } from 'sonner';

interface AttendanceRecord {
  attendance_id: number;
  date: string;
  status: 'present' | 'absent';
}

interface AttendanceOverviewRecord {
  id: number;
  reg_no: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  date: string;
  status: 'present' | 'absent' | 'not_marked';
  marked: boolean;
  can_mark: boolean;
}

export default function Attendance() {
  const { user } = useAuth();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [managerRecords, setManagerRecords] = useState<AttendanceOverviewRecord[]>([]);
  const [managerType, setManagerType] = useState<'member' | 'employee'>('member');
  const [stats, setStats] = useState({
    present: 0,
    marked: 0,
    absent: 0,
    total: 0,
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(() => new Date());

  const isManager = user?.role === 'admin' || user?.role === 'owner';

  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user?.id) {
      if (isManager) {
        fetchManagerAttendance();
      } else {
        fetchAttendanceData();
      }
    }
  }, [user?.id, user?.role, managerType]);

  const formattedDate = useMemo(
    () =>
      clock.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    [clock]
  );

  const formattedTime = useMemo(
    () =>
      clock.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    [clock]
  );

  const fetchAttendanceData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [historyRes, statsRes] = await Promise.all([
        api.get(`/get-attendance/${user.id}`),
        api.get(`/attendance-percentage/${user.id}`),
      ]);
      setHistory(historyRes.data.history || []);
      setStats({
        present: statsRes.data.days_present || 0,
        marked: statsRes.data.days_marked || 0,
        absent: statsRes.data.days_absent || 0,
        total: statsRes.data.total_days_since_join || 0,
        percentage: statsRes.data.attendance_percentage || 0,
      });
    } catch (error) {
      console.error('Fetch attendance error:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchManagerAttendance = async () => {
    try {
      setLoading(true);
      const targetType = user?.role === 'admin' ? 'member' : managerType;
      const response = await api.get(`/attendance-overview?type=${targetType}`);
      setManagerRecords(response.data.records || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch attendance overview');
    } finally {
      setLoading(false);
    }
  };

  const handleSetAttendance = async (targetUserId: number, status: 'present' | 'absent') => {
    try {
      await api.post('/attendance-status', { user_id: targetUserId, status });
      toast.success(`Marked ${status} for today`);
      fetchManagerAttendance();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update attendance');
    }
  };

  return (
    <DashboardLayout title="Attendance">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">
              {isManager ? 'Daily attendance control' : 'My attendance'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isManager
                ? 'Admin can mark attendance only once per member per day. After saving, the day is locked.'
                : 'Your attendance record reflects whether today was marked and your overall history.'}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/30 px-5 py-4 text-right">
            <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              Real-time clock
            </div>
            <p className="mt-1 text-2xl font-semibold">{formattedTime}</p>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
          </div>
        </div>

        {isManager ? (
          <>
            {user?.role === 'owner' && (
              <div className="flex gap-3">
                <button
                  onClick={() => setManagerType('member')}
                  className={`rounded-xl border px-4 py-2 ${managerType === 'member' ? 'border-primary bg-primary text-white' : 'border-border'}`}
                >
                  Members
                </button>
                <button
                  onClick={() => setManagerType('employee')}
                  className={`rounded-xl border px-4 py-2 ${managerType === 'employee' ? 'border-primary bg-primary text-white' : 'border-border'}`}
                >
                  Employees
                </button>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <ManagerStatCard
                icon={<CheckCircle className="h-5 w-5 text-green-500" />}
                label="Present Today"
                value={String(managerRecords.filter((record) => record.status === 'present').length)}
              />
              <ManagerStatCard
                icon={<XCircle className="h-5 w-5 text-red-500" />}
                label="Absent Today"
                value={String(managerRecords.filter((record) => record.status === 'absent').length)}
              />
              <ManagerStatCard
                icon={<ShieldCheck className="h-5 w-5 text-primary" />}
                label="Not Marked Yet"
                value={String(managerRecords.filter((record) => record.status === 'not_marked').length)}
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-6 py-4">
                <p className="font-medium">Today&apos;s attendance board</p>
                <p className="text-sm text-muted-foreground">
                  Once a member is marked for today, it cannot be changed until the next day starts.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-6 py-4 text-left text-sm font-semibold">ID</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Reg No</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Role</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Today Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managerRecords.map((record) => {
                      const isLocked = record.marked || loading;
                      return (
                        <tr key={`${record.id}-${record.date}`} className="border-b border-border transition-colors hover:bg-muted/30">
                          <td className="px-6 py-4 text-sm">{record.id}</td>
                          <td className="px-6 py-4 text-sm">{record.reg_no || '-'}</td>
                          <td className="px-6 py-4 text-sm font-medium">
                            {record.first_name} {record.last_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{record.email}</td>
                          <td className="px-6 py-4 text-sm capitalize">{record.role}</td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                record.status === 'present'
                                  ? 'bg-green-500/10 text-green-500'
                                  : record.status === 'absent'
                                    ? 'bg-red-500/10 text-red-500'
                                    : 'bg-yellow-500/10 text-yellow-600'
                              }`}
                            >
                              {record.status === 'not_marked' ? 'Not Marked' : record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSetAttendance(record.id, 'present')}
                                disabled={isLocked}
                                className="rounded-lg bg-green-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Present
                              </button>
                              <button
                                onClick={() => handleSetAttendance(record.id, 'absent')}
                                disabled={isLocked}
                                className="rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {managerRecords.length === 0 && !loading && (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">
                          No records found for today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-4">
              <ManagerStatCard
                icon={<Calendar className="h-5 w-5 text-primary" />}
                label="Attendance Rate"
                value={`${stats.percentage}%`}
              />
              <ManagerStatCard
                icon={<CheckCircle className="h-5 w-5 text-green-500" />}
                label="Days Present"
                value={String(stats.present)}
              />
              <ManagerStatCard
                icon={<XCircle className="h-5 w-5 text-red-500" />}
                label="Days Absent"
                value={String(stats.absent)}
              />
              <ManagerStatCard
                icon={<ShieldCheck className="h-5 w-5 text-yellow-500" />}
                label="Tracked Days"
                value={String(stats.marked)}
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr key={record.attendance_id} className="border-b border-border transition-colors hover:bg-muted/30">
                      <td className="px-6 py-4 text-sm">{record.date}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            record.status === 'present'
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-red-500/10 text-red-500'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && !loading && (
                    <tr>
                      <td colSpan={2} className="px-6 py-8 text-center text-sm text-muted-foreground">
                        No attendance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function ManagerStatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-2 flex items-center gap-3">
        {icon}
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
