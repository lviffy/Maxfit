import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { LogIn } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(formData.email, formData.password);
      if (user.role === 'admin' || user.role === 'owner') navigate('/members');
      else if (user.role === 'trainer') navigate('/trainer');
      else navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card rounded-2xl p-8 border border-border"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Login to your Max Fit account</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full py-4 bg-primary text-white rounded-lg font-medium hover:shadow-lg hover:shadow-primary/50 transition-all"
          >
            Login
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/register" className="text-primary hover:underline">
            Don't have an account? Register
          </Link>
        </div>

        <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-2">Demo credentials:</p>
          <p className="text-xs">Admin: admin@maxfit.com</p>
          <p className="text-xs">Trainer: trainer@maxfit.com</p>
          <p className="text-xs">Member: member@maxfit.com</p>
          <p className="text-xs">Owner: owner@maxfit.com</p>
        </div>
      </motion.div>
    </div>
  );
}
