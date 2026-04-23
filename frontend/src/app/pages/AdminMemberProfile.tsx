import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Mail, Save, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../services/api';

interface TrainerOption {
  user_id: number;
  first_name: string;
  last_name: string;
}

interface MemberProfileForm {
  first_name: string;
  last_name: string;
  email: string;
  membership_status: string;
  join_date: string;
  expiry_date: string;
  price: string;
  trainer_id: string;
  age: string;
  height: string;
  weight: string;
  address: string;
  dob: string;
  goal: string;
  source: string;
  reg_no: string;
}

const emptyMember: MemberProfileForm = {
  first_name: '',
  last_name: '',
  email: '',
  membership_status: 'active',
  join_date: '',
  expiry_date: '',
  price: '',
  trainer_id: '',
  age: '',
  height: '',
  weight: '',
  address: '',
  dob: '',
  goal: '',
  source: '',
  reg_no: '',
};

function formatDate(value?: string | null) {
  if (!value) return '';
  return String(value).split('T')[0];
}

export default function AdminMemberProfile() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<MemberProfileForm>(emptyMember);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!memberId) return;
      try {
        setLoading(true);
        const [detailsResponse, membersResponse] = await Promise.all([
          api.get(`/member-details/${memberId}`),
          api.get('/members'),
        ]);

        const details = detailsResponse.data;
        setFormData({
          first_name: details.first_name || '',
          last_name: details.last_name || '',
          email: details.email || '',
          membership_status: details.membership_status || 'active',
          join_date: formatDate(details.join_date),
          expiry_date: formatDate(details.expiry_date),
          price: details.price ? String(details.price) : '',
          trainer_id: details.trainer_id ? String(details.trainer_id) : '',
          age: details.age ? String(details.age) : '',
          height: details.height ? String(details.height) : '',
          weight: details.weight ? String(details.weight) : '',
          address: details.address || '',
          dob: formatDate(details.dob),
          goal: details.goal || '',
          source: details.source || '',
          reg_no: details.reg_no || '',
        });
        setTrainers(membersResponse.data?.trainers || []);
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to load member profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [memberId]);

  const bmiPreview = useMemo(() => {
    const height = Number(formData.height);
    const weight = Number(formData.weight);
    if (!height || !weight) return 'N/A';
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(2);
  }, [formData.height, formData.weight]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!memberId) return;

    try {
      setSaving(true);
      await api.post(`/update-member/${memberId}`, {
        ...formData,
        age: formData.age ? Number(formData.age) : null,
        height: formData.height ? Number(formData.height) : null,
        weight: formData.weight ? Number(formData.weight) : null,
        price: formData.price ? Number(formData.price) : null,
        trainer_id: formData.trainer_id || null,
      });
      toast.success('Member profile updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update member');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!memberId) return;
    if (!window.confirm('Delete this member permanently?')) return;

    try {
      await api.delete(`/delete-member/${memberId}`);
      toast.success('Member deleted');
      navigate('/members');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete member');
    }
  };

  return (
    <DashboardLayout title="Member Profile">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Link to="/members" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to members
            </Link>
            <h2 className="text-2xl font-semibold">
              {loading ? 'Loading member...' : `${formData.first_name} ${formData.last_name}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {formData.reg_no ? `Registration: ${formData.reg_no}` : 'Update every stored member detail from this page.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <ProfileMetric label="Status" value={formData.membership_status || 'N/A'} />
            <ProfileMetric label="BMI" value={bmiPreview} />
            <ProfileMetric label="Price" value={formData.price ? `Rs ${formData.price}` : 'N/A'} />
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-6 rounded-2xl border border-border bg-card p-6">
              <div>
                <h3 className="text-lg font-semibold">Personal information</h3>
                <p className="text-sm text-muted-foreground">This opens as the full member profile page from the list view.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="First Name">
                  <input name="first_name" value={formData.first_name} onChange={handleChange} className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" />
                </Field>
                <Field label="Last Name">
                  <input name="last_name" value={formData.last_name} onChange={handleChange} className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" />
                </Field>
              </div>

              <Field label="Email">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input name="email" type="email" value={formData.email} onChange={handleChange} className="w-full rounded-xl border border-border bg-input py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Date of Birth">
                  <input name="dob" type="date" value={formData.dob} onChange={handleChange} className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" />
                </Field>
                <Field label="Age">
                  <input name="age" value={formData.age} onChange={handleChange} className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" />
                </Field>
              </div>

              <Field label="Address">
                <textarea name="address" rows={4} value={formData.address} onChange={handleChange} className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Goal">
                  <input name="goal" value={formData.goal} onChange={handleChange} className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" />
                </Field>
                <Field label="Source">
                  <input name="source" value={formData.source} onChange={handleChange} className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" />
                </Field>
              </div>
            </section>

            <section className="space-y-6 rounded-2xl border border-border bg-card p-6">
              <div>
                <h3 className="text-lg font-semibold">Membership settings</h3>
                <p className="text-sm text-muted-foreground">Update status, dates, measurements, payment, and trainer assignment.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Membership Status">
                  <select name="membership_status" value={formData.membership_status} onChange={handleChange} className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                  </select>
                </Field>
                <Field label="Assigned Trainer">
                  <select name="trainer_id" value={formData.trainer_id} onChange={handleChange} className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Unassigned</option>
                    {trainers.map((trainer) => (
                      <option key={trainer.user_id} value={trainer.user_id}>
                        {trainer.first_name} {trainer.last_name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Join Date">
                  <input name="join_date" type="date" value={formData.join_date} onChange={handleChange} className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" />
                </Field>
                <Field label="Expiry Date">
                  <input name="expiry_date" type="date" value={formData.expiry_date} onChange={handleChange} className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Height (cm)">
                  <input name="height" value={formData.height} onChange={handleChange} className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" />
                </Field>
                <Field label="Weight (kg)">
                  <input name="weight" value={formData.weight} onChange={handleChange} className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" />
                </Field>
              </div>

              <Field label="Membership Price">
                <input name="price" value={formData.price} onChange={handleChange} className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" />
              </Field>
            </section>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Changes save directly to the member record, including personal and membership details.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 px-4 py-3 text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete Member
              </button>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={saving || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </motion.button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
