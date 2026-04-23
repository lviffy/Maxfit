import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Calendar, Mail, MapPin, Ruler, UserPlus, Weight } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../services/api';

interface TrainerOption {
  user_id: number;
  first_name: string;
  last_name: string;
}

interface MemberFormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  dob: string;
  age: string;
  address: string;
  goal: string;
  source: string;
  height: string;
  weight: string;
  join_date: string;
  expiry_date: string;
  price: string;
  membership_status: string;
  trainer_id: string;
}

const createInitialFormData = (): MemberFormData => {
  const today = new Date();
  const expiry = new Date(today);
  expiry.setMonth(expiry.getMonth() + 1);

  return {
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    dob: '',
    age: '',
    address: '',
    goal: 'general_fitness',
    source: 'walk_in',
    height: '',
    weight: '',
    join_date: today.toISOString().split('T')[0],
    expiry_date: expiry.toISOString().split('T')[0],
    price: '',
    membership_status: 'active',
    trainer_id: '',
  };
};

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) return '';
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDifference = today.getMonth() - dob.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return String(age);
}

export default function AdminAddMember() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<MemberFormData>(createInitialFormData);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        const response = await api.get('/members');
        setTrainers(response.data?.trainers || []);
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to load trainers');
      }
    };

    fetchTrainers();
  }, []);

  const bmiPreview = useMemo(() => {
    const height = Number(formData.height);
    const weight = Number(formData.weight);
    if (!height || !weight) return null;
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(2);
  }, [formData.height, formData.weight]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((previous) => {
      const next = { ...previous, [name]: value };
      if (name === 'dob') {
        next.age = calculateAge(value);
      }
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/add-member', {
        ...formData,
        age: formData.age ? Number(formData.age) : null,
        height: formData.height ? Number(formData.height) : null,
        weight: formData.weight ? Number(formData.weight) : null,
        price: formData.price ? Number(formData.price) : 0,
        trainer_id: formData.trainer_id || null,
      });

      toast.success(response.data?.message || 'Member created successfully');
      setFormData(createInitialFormData());

      if (response.data?.member_id) {
        navigate(`/members/${response.data.member_id}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Add Member">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Add a new member</h2>
              <p className="text-sm text-muted-foreground">
                Create a member account with personal, membership, and fitness details in one place.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            BMI preview: <span className="font-semibold text-foreground">{bmiPreview ?? 'Add height and weight'}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-6 rounded-2xl border border-border bg-card p-6">
              <div>
                <h3 className="text-lg font-semibold">Personal details</h3>
                <p className="text-sm text-muted-foreground">Basic profile information used across the admin panel.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="First Name">
                  <input
                    required
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </FormField>
                <FormField label="Last Name">
                  <input
                    required
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </FormField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Email">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      required
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-border bg-input py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </FormField>
                <FormField label="Password">
                  <input
                    required
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </FormField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Date of Birth">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-border bg-input py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </FormField>
                <FormField label="Age">
                  <input
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </FormField>
              </div>

              <FormField label="Address">
                <div className="relative">
                  <MapPin className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={4}
                    className="w-full rounded-xl border border-border bg-input py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </FormField>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Goal">
                  <select
                    name="goal"
                    value={formData.goal}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="general_fitness">General Fitness</option>
                    <option value="weight_loss">Weight Loss</option>
                    <option value="muscle_gain">Muscle Gain</option>
                    <option value="endurance">Endurance</option>
                    <option value="strength">Strength</option>
                  </select>
                </FormField>
                <FormField label="Source">
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="walk_in">Walk In</option>
                    <option value="referral">Referral</option>
                    <option value="instagram">Instagram</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="website">Website</option>
                  </select>
                </FormField>
              </div>
            </section>

            <section className="space-y-6 rounded-2xl border border-border bg-card p-6">
              <div>
                <h3 className="text-lg font-semibold">Membership and health</h3>
                <p className="text-sm text-muted-foreground">Everything needed to activate the member profile.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Height (cm)">
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-border bg-input py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </FormField>
                <FormField label="Weight (kg)">
                  <div className="relative">
                    <Weight className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-border bg-input py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </FormField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Join Date">
                  <input
                    type="date"
                    name="join_date"
                    value={formData.join_date}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </FormField>
                <FormField label="Expiry Date">
                  <input
                    type="date"
                    name="expiry_date"
                    value={formData.expiry_date}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </FormField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Membership Status">
                  <select
                    name="membership_status"
                    value={formData.membership_status}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                  </select>
                </FormField>
                <FormField label="Assigned Trainer">
                  <select
                    name="trainer_id"
                    value={formData.trainer_id}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Unassigned</option>
                    {trainers.map((trainer) => (
                      <option key={trainer.user_id} value={trainer.user_id}>
                        {trainer.first_name} {trainer.last_name}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Membership Price">
                <input
                  required
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </FormField>

            </section>
          </div>

          <div className="flex justify-end">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating member...' : 'Create Member'}
            </motion.button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
