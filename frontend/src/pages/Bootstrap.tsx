import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Bootstrap() {
  const navigate = useNavigate();
  const { bootstrap, isBootstrapped } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  React.useEffect(() => {
    // If already bootstrapped, redirect to landing
    if (isBootstrapped === true) {
      navigate('/');
    }
  }, [isBootstrapped, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      await bootstrap(formData.email, formData.password, formData.name);
      toast.success('System initialized! Welcome, Administrator.');
      navigate('/admin/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bootstrap failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
  <div className="relative min-h-screen bg-[#0e1013] overflow-hidden">

    {/* Soft industrial grid */}
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
      <div className="w-full max-w-md">

        {/* Header */}
        <div
          className="
            rounded-2xl p-7 mb-8
            bg-gradient-to-br from-purple-600/70 via-purple-500/30 to-purple-800/70
            border border-white/20 backdrop-blur-xl
            shadow-[0_20px_60px_rgba(0,0,0,0.45)]
            text-center
          "
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-black/30 mb-4">
            <Shield size={28} className="text-white" />
          </div>

          <h1 className="text-4xl font-bold text-white tracking-tight">
            Initialize System
          </h1>

          <div className="h-px w-16 bg-white/30 mx-auto mt-4 rounded-full" />

          <p className="text-slate-200/80 mt-4 text-sm">
            Create the first administrator account
          </p>
        </div>

        {/* Bootstrap Form */}
        <form
          onSubmit={handleSubmit}
          className="
            relative rounded-2xl p-8 space-y-6
            bg-white/[0.06] backdrop-blur-3xl
            border border-white/20
            shadow-[0_40px_120px_rgba(0,0,0,0.45)]
          "
        >
          <div
            className="absolute inset-0 rounded-2xl
            bg-gradient-to-br from-white/10 via-transparent to-white/5
            pointer-events-none"
          />

          {/* Name */}
          <div>
            <label className="block text-slate-300 mb-2 text-sm">
              Full name
            </label>
            <input
              type="text"
              className="
                w-full rounded-xl bg-white/10
                border border-white/20
                px-5 py-3 text-white
                placeholder-slate-400
                focus:outline-none focus:ring-1 focus:ring-white/40
              "
              placeholder="System Administrator"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-slate-300 mb-2 text-sm">
              Email address
            </label>
            <input
              type="email"
              className="
                w-full rounded-xl bg-white/10
                border border-white/20
                px-5 py-3 text-white
                placeholder-slate-400
                focus:outline-none focus:ring-1 focus:ring-white/40
              "
              placeholder="admin@company.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-slate-300 mb-2 text-sm">
              Password
            </label>
            <input
              type="password"
              className="
                w-full rounded-xl bg-white/10
                border border-white/20
                px-5 py-3 text-white
                placeholder-slate-400
                focus:outline-none focus:ring-1 focus:ring-white/40
              "
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              minLength={8}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-slate-300 mb-2 text-sm">
              Confirm password
            </label>
            <input
              type="password"
              className="
                w-full rounded-xl bg-white/10
                border border-white/20
                px-5 py-3 text-white
                placeholder-slate-400
                focus:outline-none focus:ring-1 focus:ring-white/40
              "
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
            />
          </div>

          {/* CTA */}
          <button
            type="submit"
            disabled={isLoading}
            className="
              group relative w-full overflow-hidden
              rounded-full py-4
              bg-black/90 text-white font-medium tracking-wide
              border border-white/10
              transition-all duration-300
              hover:bg-black hover:border-white/20
              disabled:opacity-60
            "
          >
            <span
              className="absolute inset-0
              bg-gradient-to-r from-transparent via-white/10 to-transparent
              translate-x-[-100%] group-hover:translate-x-[100%]
              transition-transform duration-700"
            />
            <span className="relative text-lg">
              {isLoading ? 'Initializing…' : 'Initialize System'}
            </span>
          </button>
        </form>

        {/* Footer note */}
        <p className="text-center text-slate-500 text-xs mt-6 leading-relaxed">
          This action creates the first administrator account.
          <br />
          All other users must be created by an administrator.
        </p>
      </div>
    </div>
  </div>
);
}