import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Calendar, CheckCircle, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { toast } from 'sonner';

interface AttendanceRecord {
  attendance_id: number;
  date: string;
}

interface OwnerAttendanceRecord {
  id: number;
  reg_no: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  date: string;
  status: 'present' | 'absent';
}

export default function Attendance() {
  const { user } = useAuth();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [ownerRecords, setOwnerRecords] = useState<OwnerAttendanceRecord[]>([]);
  const [ownerType, setOwnerType] = useState<'member' | 'employee'>('member');
  const [stats, setStats] = useState({ present: 0, total: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      if (user.role === 'owner') {
        fetchOwnerAttendance();
      } else {
        fetchAttendanceData();
      }
    }
  }, [user?.id, user?.role, ownerType]);

  const fetchAttendanceData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [historyRes, statsRes] = await Promise.all([
        api.get(`/get-attendance/${user.id}`),
        api.get(`/attendance-percentage/${user.id}`)
      ]);
      setHistory(historyRes.data.history || []);
      setStats({
        present: statsRes.data.days_present || 0,
        total: statsRes.data.total_days_since_join || 0,
        percentage: statsRes.data.attendance_percentage || 0
      });
    } catch (error) {
      console.error('Fetch attendance error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnerAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/attendance-overview?type=${ownerType}`);
      setOwnerRecords(response.data.records || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch attendance overview');
    } finally {
      setLoading(false);
    }
  };

  const handleSetAttendance = async (targetUserId: number, status: 'present' | 'absent') => {
    try {
      await api.post('/attendance-status', { user_id: targetUserId, status });
      toast.success(`Marked ${status}`);
      fetchOwnerAttendance();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update attendance');
    }
  };

  const handleMarkAttendance = async () => {
    if (!user?.id) return;
    try {
      await api.post('/add-attendance', { user_id: user.id });
      toast.success('Attendance marked successfully!');
      fetchAttendanceData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to mark attendance');
    }
  };

  return (
    <DashboardLayout title="Attendance">
      <div className="space-y-6">
        {user?.role === 'owner' ? (
          <>
            <div className="flex gap-3">
              <button
                onClick={() => setOwnerType('member')}
                className={`px-4 py-2 rounded-lg border ${ownerType === 'member' ? 'bg-primary text-white border-primary' : 'border-border'}`}
              >
                Members
              </button>
              <button
                onClick={() => setOwnerType('employee')}
                className={`px-4 py-2 rounded-lg border ${ownerType === 'employee' ? 'bg-primary text-white border-primary' : 'border-border'}`}
              >
                Employees
              </button>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-6 py-4 text-left text-sm font-semibold">ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Reg No</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ownerRecords.map((record) => (
                    <tr key={`${record.id}-${record.date}`} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-sm">{record.id}</td>
                      <td className="px-6 py-4 text-sm">{record.reg_no || '-'}</td>
                      <td className="px-6 py-4 text-sm">{record.first_name} {record.last_name}</td>
                      <td className="px-6 py-4 text-sm capitalize">{record.role}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${record.status === 'present' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSetAttendance(record.id, 'present')}
                            className="px-3 py-1 text-xs rounded-lg bg-green-500 text-white hover:bg-green-600"
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleSetAttendance(record.id, 'absent')}
                            className="px-3 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600"
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {ownerRecords.length === 0 && !loading && (
                    <tr><td colSpan={6} className="px-6 py-4 text-sm text-center text-muted-foreground">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-end">
              <button
                onClick={handleMarkAttendance}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Mark Today
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                </div>
                <p className="text-3xl font-bold">{stats.percentage}%</p>
              </div>
              <div className="p-6 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <p className="text-sm text-muted-foreground">Days Present</p>
                </div>
                <p className="text-3xl font-bold">{stats.present}</p>
              </div>
              <div className="p-6 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-red-500" />
                  <p className="text-sm text-muted-foreground">Total Days Valid</p>
                </div>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr key={record.attendance_id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-sm">{record.date}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">Present</span>
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && !loading && (
                    <tr><td colSpan={2} className="px-6 py-4 text-sm text-center text-muted-foreground">No attendance records found.</td></tr>
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
