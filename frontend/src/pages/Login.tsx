import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const selectedRole = (location.state as any)?.role || 'admin';

  React.useEffect(() => {
    // If user is already logged in, redirect to their dashboard
    if (user) {
      switch (user.role) {
        case 'ADMIN':
          navigate('/admin/dashboard');
          break;
        case 'MANUFACTURER':
          navigate('/manufacturer/dashboard');
          break;
        case 'RETAILER':
          navigate('/retailer/dashboard');
          break;
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      toast.success('Login successful!');
      // Navigation will happen via useEffect when user state updates
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const roleColors: Record<string, string> = {
    admin: 'from-purple-600 to-purple-800',
    manufacturer: 'from-blue-600 to-blue-800',
    retailer: 'from-green-600 to-green-800',
  };

  const roleTitles: Record<string, string> = {
    admin: 'Administrator',
    manufacturer: 'Manufacturer',
    retailer: 'Retailer',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dark-950">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-dark-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to role selection
        </Link>

        <div className={`bg-gradient-to-br ${roleColors[selectedRole]} rounded-2xl p-8 mb-6`}>
          <h1 className="text-2xl font-bold text-white">
            {roleTitles[selectedRole]} Login
          </h1>
          <p className="text-white/80 mt-1">
            Enter your credentials to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          <div>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Your password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            <LogIn size={20} />
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}