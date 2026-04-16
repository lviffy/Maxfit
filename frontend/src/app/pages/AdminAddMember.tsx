import DashboardLayout from '../components/DashboardLayout';
import { UserPlus, Calendar, Mail, Weight, Ruler } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { api } from '../services/api';

interface MembershipPlan {
  plan_id: number;
  plan_code: string;
  plan_name: string;
  duration_months: number;
  final_price: number;
}

export default function AdminAddMember() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    dob: '',
    gender: 'male',
    plan_id: '',
    price: 0,
    weight: '',
    height: '',
    goal: 'general',
  });
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/add-member', formData);
      setSuccess(true);
      setFormData({
        firstName: '', lastName: '', email: '', password: '', phone: '', dob: '', gender: 'male', plan_id: '', price: 0, weight: '', height: '', goal: 'general'
      });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.get('/membership-plans');
        const fetchedPlans: MembershipPlan[] = response.data?.plans || [];
        setPlans(fetchedPlans);
        const monthlyPlan = fetchedPlans.find(
          (plan) => plan.duration_months === 1 || plan.plan_code?.toLowerCase() === 'monthly'
        ) || fetchedPlans[0];
        if (monthlyPlan) {
          setFormData((prev) => ({
            ...prev,
            plan_id: String(monthlyPlan.plan_id),
            price: monthlyPlan.final_price,
          }));
        }
      } catch (error) {
        console.error('Failed to load plans', error);
      }
    };

    fetchPlans();
  }, []);

  const handleChange = (e: any) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <DashboardLayout title="Add New Member">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Member Registration</h2>
            <p className="text-muted-foreground">Register a new gym member instantly.</p>
          </div>
        </div>

        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-green-500/10 border border-green-500 text-green-500 rounded-lg">
            Member registered successfully! Login credentials have been sent to their email.
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
          {/* Personal Info */}
          <div className="space-y-6 bg-card p-6 rounded-xl border border-border">
            <h3 className="text-lg font-semibold border-b border-border pb-2">Personal Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 text-muted-foreground">First Name</label>
                <input required type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm mb-1 text-muted-foreground">Last Name</label>
                <input required type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1 text-muted-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1 text-muted-foreground">Account Password</label>
              <input required type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 text-muted-foreground">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input required type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1 text-muted-foreground">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Fitness & Plan */}
          <div className="space-y-6 bg-card p-6 rounded-xl border border-border">
            <h3 className="text-lg font-semibold border-b border-border pb-2">Fitness & Plan Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 text-muted-foreground">Current Weight (kg)</label>
                <div className="relative">
                  <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="number" name="weight" value={formData.weight} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1 text-muted-foreground">Height (cm)</label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="number" name="height" value={formData.height} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1 text-muted-foreground">Fitness Goal</label>
              <select name="goal" value={formData.goal} onChange={handleChange} className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="weight_loss">Weight Loss</option>
                <option value="muscle_gain">Muscle Gain</option>
                <option value="endurance">Endurance & Stamina</option>
                <option value="general">General Fitness</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm mb-1 text-muted-foreground">Membership Plan</label>
                  <select
                    name="plan_id"
                    value={formData.plan_id}
                    onChange={(e) => {
                      const selectedPlan = plans.find(plan => String(plan.plan_id) === e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        plan_id: e.target.value,
                        price: selectedPlan?.final_price ?? prev.price,
                      }));
                    }}
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {plans.map((plan) => (
                      <option key={plan.plan_id} value={plan.plan_id}>
                        {plan.plan_name} - Rs {Number(plan.final_price).toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
               </div>
               <div>
                  <label className="block text-sm mb-1 text-muted-foreground">Amount Paid (Rs)</label>
                  <input required type="number" name="price" value={formData.price} onChange={handleChange} className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
               </div>
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Register Member'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
