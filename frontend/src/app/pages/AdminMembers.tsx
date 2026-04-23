import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Edit2, Eye, Plus, Search, Trash2, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../services/api';

interface Member {
  id: number;
  regNo: string;
  name: string;
  email: string;
  joinDate: string;
  expiryDate: string;
  remainingDays: number | null;
  price: number;
  status: 'active' | 'expired' | 'pending';
  trainer: string;
  trainerId?: number | null;
  trainerAddonEnabled: boolean;
}

interface TrainerOption {
  user_id: number;
  first_name: string;
  last_name: string;
}

function formatDate(d: any): string {
  if (!d) return '';
  const s = String(d);
  if (s.includes('T')) return s.split('T')[0];
  
  try {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch (e) {}
  
  if (s.includes('00:00:00')) {
    const parts = s.split('00:00:00')[0].trim();
    try {
      const parsed2 = new Date(parts);
      if (!isNaN(parsed2.getTime())) {
        return parsed2.toISOString().split('T')[0];
      }
    } catch(e) {}
    return parts;
  }
  
  return s;
}

export default function AdminMembers() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTrainer, setFilterTrainer] = useState('all');
  const [members, setMembers] = useState<Member[]>([]);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [searchQuery, filterStatus, filterTrainer]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterStatus !== 'all') params.append('membership_status', filterStatus);
      if (filterTrainer !== 'all') params.append('trainer_id', filterTrainer);

      const response = await api.get(`/members?${params.toString()}`);
      const fetchedMembers = response.data?.members || [];
      const mappedMembers = fetchedMembers.map((member: any) => ({
        id: member.id,
        regNo: member.reg_no,
        name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
        email: member.email,
        joinDate: formatDate(member.join_date),
        expiryDate: formatDate(member.expiry_date),
        remainingDays:
          typeof member.remaining_days === 'number'
            ? member.remaining_days
            : member.remaining_days === 'N/A'
              ? null
              : Number(member.remaining_days),
        price: Number(member.price || 0),
        status: (member.membership_status || 'pending') as 'active' | 'expired' | 'pending',
        trainer:
          member.trainer_name && member.trainer_last_name
            ? `${member.trainer_name} ${member.trainer_last_name}`
            : member.trainer_name || 'Unassigned',
        trainerId: member.trainer_id,
        trainerAddonEnabled: Boolean(member.trainer_addon_enabled),
      }));

      setMembers(mappedMembers);
      setTrainers(response.data?.trainers || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500';
      case 'expired':
        return 'bg-red-500/10 text-red-500';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleTrainerChange = async (memberId: number, trainerId: string) => {
    try {
      await api.post(`/update-member/${memberId}`, { trainer_id: trainerId || null });
      toast.success('Trainer updated');
      fetchMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update trainer');
    }
  };

  const handleDelete = async (member: Member) => {
    if (!window.confirm(`Delete member ${member.name}?`)) return;

    try {
      await api.delete(`/delete-member/${member.id}`);
      toast.success('Member deleted');
      fetchMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete member');
    }
  };

  return (
    <DashboardLayout title="Members Management">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Members from the database</h2>
              <p className="text-sm text-muted-foreground">
                Admin can view every member, open full profile pages, edit details, and manage trainer assignments.
              </p>
            </div>
          </div>
          <Link
            to="/members/add"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[280px] flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, or registration number"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            className="rounded-xl border border-border bg-card px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="pending">Pending</option>
          </select>

          <select
            value={filterTrainer}
            onChange={(event) => setFilterTrainer(event.target.value)}
            className="rounded-xl border border-border bg-card px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Trainers</option>
            {trainers.map((trainer) => (
              <option key={trainer.user_id} value={trainer.user_id}>
                {trainer.first_name} {trainer.last_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Total Members" value={String(members.length)} />
          <MetricCard
            label="Active Members"
            value={String(members.filter((member) => member.status === 'active').length)}
            tone="text-green-500"
          />
          <MetricCard
            label="Expired Members"
            value={String(members.filter((member) => member.status === 'expired').length)}
            tone="text-red-500"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-4 text-left text-sm font-semibold">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Reg No</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Join Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Expiry Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Remaining Days</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Price</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Trainer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, index) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-border transition-colors hover:bg-muted/30"
                  >
                    <td className="px-6 py-4 text-sm">{member.id}</td>
                    <td className="px-6 py-4 text-sm font-medium">{member.regNo}</td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <button
                        onClick={() => navigate(`/members/${member.id}`)}
                        className="text-left transition-colors hover:text-primary"
                      >
                        {member.name}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{member.email}</td>
                    <td className="px-6 py-4 text-sm">{member.joinDate || '-'}</td>
                    <td className="px-6 py-4 text-sm">{member.expiryDate || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={
                          member.remainingDays === null
                            ? 'text-muted-foreground'
                            : member.remainingDays <= 0
                              ? 'text-red-500'
                              : member.remainingDays <= 7
                                ? 'text-red-400'
                                : member.remainingDays <= 30
                                  ? 'text-yellow-500'
                                  : 'text-green-500'
                        }
                      >
                        {member.remainingDays === null
                          ? '-'
                          : member.remainingDays < 0
                            ? `Starts in ${Math.abs(member.remainingDays)} days`
                            : `${member.remainingDays} days`}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">Rs {member.price}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusColor(member.status)}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {member.trainerAddonEnabled ? (
                        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
                          <span className="text-xs font-medium text-yellow-600">{member.trainer || 'Personal Trainer'}</span>
                          <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-600">Add-on</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <select
                          value={member.trainerId || ''}
                          onChange={(event) => handleTrainerChange(member.id, event.target.value)}
                          className="rounded-lg border border-border bg-input px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Unassigned</option>
                          {trainers.map((trainer) => (
                            <option key={trainer.user_id} value={trainer.user_id}>
                              {trainer.first_name} {trainer.last_name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/members/${member.id}`)}
                          className="rounded-lg p-2 text-blue-500 transition-colors hover:bg-blue-500/10"
                          title="Open profile"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingMember(member)}
                          className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10"
                          title="Quick edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(member)}
                          className="rounded-lg p-2 text-destructive transition-colors hover:bg-destructive/10"
                          title="Delete member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {members.length === 0 && !loading && (
                  <tr>
                    <td colSpan={11} className="px-6 py-10 text-center text-sm text-muted-foreground">
                      No members found for the current filters.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={11} className="px-6 py-10 text-center text-sm text-muted-foreground">
                      Loading members...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6"
          >
            <div className="mb-5">
              <h3 className="text-lg font-semibold">Quick member update</h3>
              <p className="text-sm text-muted-foreground">
                Use the profile page for full editing. This dialog updates the key membership fields quickly.
              </p>
            </div>

            <form
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  await api.post(`/update-member/${editingMember.id}`, {
                    price: editingMember.price,
                    membership_status: editingMember.status,
                    join_date: editingMember.joinDate || null,
                    expiry_date: editingMember.expiryDate || null,
                  });
                  toast.success('Member updated');
                  setEditingMember(null);
                  fetchMembers();
                } catch (error: any) {
                  toast.error(error.response?.data?.error || 'Failed to update member');
                }
              }}
              className="space-y-4"
            >
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">Membership Price</span>
                <input
                  type="number"
                  value={editingMember.price}
                  onChange={(event) =>
                    setEditingMember({ ...editingMember, price: Number(event.target.value) })
                  }
                  className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">Status</span>
                <select
                  value={editingMember.status}
                  onChange={(event) =>
                    setEditingMember({
                      ...editingMember,
                      status: event.target.value as Member['status'],
                    })
                  }
                  className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm text-muted-foreground">Join Date</span>
                  <input
                    type="date"
                    value={editingMember.joinDate}
                    onChange={(event) =>
                      setEditingMember({ ...editingMember, joinDate: event.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm text-muted-foreground">Expiry Date</span>
                  <input
                    type="date"
                    value={editingMember.expiryDate}
                    onChange={(event) =>
                      setEditingMember({ ...editingMember, expiryDate: event.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/members/${editingMember.id}`)}
                  className="rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted"
                >
                  Open Full Profile
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-primary px-4 py-3 text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}

function MetricCard({
  label,
  value,
  tone = 'text-foreground',
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
