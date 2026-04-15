import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Search, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../services/api';
import { toast } from 'sonner';

interface Employee {
  id: number;
  regNo: string;
  name: string;
  email: string;
  joinDate: string;
  role: string;
  status: 'active' | 'pending';
  source: 'users' | 'pending';
}

export default function AdminEmployees() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, [searchQuery, filterStatus, filterRole]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterRole !== 'all') params.append('role', filterRole);
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const response = await api.get(`/employees-with-pending?${params.toString()}`);
      if (response.data && response.data.employees) {
        const mappedEmployees = response.data.employees.map((e: any) => ({
          id: e.id,
          regNo: e.reg_no || `PEND-${e.id}`,
          name: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
          email: e.email,
          joinDate: e.join_date ? new Date(e.join_date).toISOString().split('T')[0] : '',
          role: e.role,
          status: (e.status || 'pending') as 'active' | 'pending',
          source: (e.source || 'pending') as 'users' | 'pending',
        }));
        setEmployees(mappedEmployees);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast.error((error as any)?.response?.data?.error || 'Failed to fetch pending employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-500 bg-green-500/10';
      case 'pending':
        return 'text-yellow-500 bg-yellow-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <DashboardLayout title="Employee Approvals & Management">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, or reg no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          >
            <option value="all">All Status</option>
            <option value="active">Active (Verified)</option>
            <option value="pending">Pending (Awaiting Verification)</option>
          </select>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-3 rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          >
            <option value="all">All Roles</option>
            <option value="trainer">Trainer</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-4 text-left text-sm font-semibold">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Reg No</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee, index) => (
                  <motion.tr
                    key={employee.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ backgroundColor: 'var(--color-muted)' }}
                    className="border-b border-border transition-colors"
                  >
                    <td className="px-6 py-4 text-sm">{employee.id}</td>
                    <td className="px-6 py-4 text-sm font-medium">{employee.regNo}</td>
                    <td className="px-6 py-4 text-sm font-medium capitalize text-primary">{employee.role}</td>
                    <td className="px-6 py-4 text-sm font-medium">{employee.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{employee.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        {employee.status === 'pending' && employee.source === 'pending' && (
                           <motion.button
                             onClick={async () => {
                               try {
                                 const response = await api.post(`/approve-employee/${employee.id}`);
                                 toast.success(response.data?.message || 'Employee approved');
                                 fetchEmployees();
                               } catch (err) {
                                 console.error('Failed to verify employee', err);
                                 toast.error((err as any)?.response?.data?.error || 'Failed to approve employee');
                               }
                             }}
                             whileHover={{ scale: 1.05 }}
                             whileTap={{ scale: 0.95 }}
                             className="px-3 py-1 text-xs font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                           >
                             Verify
                           </motion.button>
                        )}
                        <motion.button
                          onClick={() => setEditingEmployee(employee)}
                          whileHover={{ scale: 1.1, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          onClick={async () => {
                            if (window.confirm(`Are you sure you want to remove ${employee.role} ${employee.name}?`)) {
                              try {
                                const response = employee.source === 'pending'
                                  ? await api.delete(`/reject-employee/${employee.id}`)
                                  : await api.delete(`/delete-member/${employee.id}`);
                                toast.success(response.data?.message || 'Employee updated');
                                fetchEmployees();
                              } catch (err) {
                                console.error('Failed to update employee', err);
                                toast.error((err as any)?.response?.data?.error || 'Failed to update employee');
                              }
                            }
                          }}
                          whileHover={{ scale: 1.1, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {employees.length === 0 && !loading && (
                   <tr className="border-b border-border">
                     <td colSpan={7} className="text-center py-6 text-muted-foreground">No employees found.</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-card border border-border rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold mb-4">Edit Employee Status</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (editingEmployee.source === 'pending' && editingEmployee.status === 'active') {
                  const response = await api.post(`/approve-employee/${editingEmployee.id}`);
                  toast.success(response.data?.message || 'Employee approved');
                } else if (editingEmployee.source === 'pending') {
                  const response = await api.delete(`/reject-employee/${editingEmployee.id}`);
                  toast.success(response.data?.message || 'Employee rejected');
                } else {
                  toast.success('Employee is already approved');
                }
                setEditingEmployee(null);
                fetchEmployees();
              } catch (err) {
                console.error(err);
                toast.error((err as any)?.response?.data?.error || 'Failed to update employee status');
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select value={editingEmployee.status} onChange={e => setEditingEmployee({...editingEmployee, status: e.target.value as any})} className="w-full px-4 py-2 border rounded-lg bg-input border-border focus:outline-none">
                  <option value="active">Active (Verified)</option>
                  <option value="pending">Pending (Hidden)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditingEmployee(null)} className="px-4 py-2 rounded-lg border border-border hover:bg-muted">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90">Save Changes</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}
