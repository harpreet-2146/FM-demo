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
      toast.success('Login successful');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const roleGradients: Record<string, string> = {
    admin: 'from-purple-600/70 via-purple-500/30 to-purple-800/70',
    manufacturer: 'from-blue-600/70 via-cyan-500/30 to-blue-800/70',
    retailer: 'from-emerald-600/70 via-lime-500/30 to-emerald-800/70',
  };

  const roleTitles: Record<string, string> = {
    admin: 'Administrator',
    manufacturer: 'Manufacturer',
    retailer: 'Retailer',
  };

  return (
    <div className="relative min-h-screen bg-[#0e1013] overflow-hidden">

    {/* Soft industrial grid (more legible) */}
<div
  className="absolute inset-0"
  style={{
    backgroundImage: `
      linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)
    `,
    backgroundSize: "140px 140px",
  }}
/>


      {/* Centered content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

          {/* LEFT — LOGIN (PRIMARY) */}
          <div className="max-w-md">

            <Link
              to="/"
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition"
            >
              <ArrowLeft size={18} />
              Back to role selection
            </Link>

            {/* Role Header */}
            <div
              className={`rounded-2xl p-7 mb-6 bg-gradient-to-br ${roleGradients[selectedRole]}
              border border-white/20 backdrop-blur-xl
              shadow-[0_20px_60px_rgba(0,0,0,0.45)]`}
            >
              <h1 className="text-5xl font-bold text-white tracking-tight leading-tight">
                {roleTitles[selectedRole]} Access
              </h1>
              <div className="h-px w-20 bg-white/30 mt-4 rounded-full" />
            </div>

            {/* Login Card — BIGGER */}
            <form
              onSubmit={handleSubmit}
              className="relative rounded-2xl p-8 space-y-7
              bg-white/[0.06] backdrop-blur-3xl
              border border-white/20
              shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
            >
              <div className="absolute inset-0 rounded-2xl
                bg-gradient-to-br from-white/10 via-transparent to-white/5
                pointer-events-none" />

              {/* Email */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  name="username"
                  autoComplete="username"
                  className="w-full rounded-xl bg-white/10
                  border border-white/20
                  px-5 py-3 text-white text-[15px]
                  placeholder-slate-400
                  focus:outline-none focus:ring-1 focus:ring-white/40"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  className="w-full rounded-xl bg-white/10
                  border border-white/20
                  px-5 py-3 text-white text-[15px]
                  placeholder-slate-400
                  focus:outline-none focus:ring-1 focus:ring-white/40"
                  placeholder="Your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>

              {/* Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full overflow-hidden
                rounded-full py-4
                bg-black/90 text-white font-medium tracking-wide
                border border-white/10
                transition-all duration-300
                hover:bg-black hover:border-white/20
                disabled:opacity-60"
              >
                <span className="absolute inset-0
                  bg-gradient-to-r from-transparent via-white/10 to-transparent
                  translate-x-[-100%] group-hover:translate-x-[100%]
                  transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-2 text-[15px]">
                  <LogIn size={18} />
                  {isLoading ? 'Signing in…' : 'Sign in'}
                </span>
              </button>
            </form>
          </div>

          {/* RIGHT — CONTEXT (SECONDARY) */}
          <div className="max-w-lg">
            <p className="text-xs uppercase tracking-widest text-slate-400 mb-4">
              Platform Overview
            </p>

            <h2 className="text-2xl font-semibold text-white mb-5 leading-snug">
              Production-grade inventory and operations
              for food manufacturing businesses
            </h2>

            <p className="text-sm text-slate-400 leading-relaxed space-y-4">
              It provides full visibility into production, inventory,
              dispatch, sales, returns, and financial settlements across
              manufacturers and retailers.
              <br /><br />
              All stock and monetary movements are controlled through
              audited, document-based workflows. The system is designed
              for accuracy, compliance, and scale, with role-based
              operational control.
              <br /><br />
              Built to reflect how real supply chains work.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
