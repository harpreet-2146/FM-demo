import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Factory, Store, ArrowRight } from 'lucide-react';
import bgImage from '../assets/bg.webp';

export default function Landing() {
  const navigate = useNavigate();
  const { user, isBootstrapped, isLoading } = useAuth();

  useEffect(() => {
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
        default:
          break;
      }
    }
  }, [user, navigate]);

  /* -------------------- LOADING -------------------- */
  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  /* -------------------- BOOTSTRAP REQUIRED -------------------- */
  if (isBootstrapped === false) {
    return (
      <div className="w-screen h-screen relative overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bgImage})` }}
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Content */}
        <div className="relative z-10 h-full flex items-center justify-center px-6">
  <div className="text-center max-w-xl">

    {/* Icon */}
    <div className="mx-auto mb-8 w-20 h-20 rounded-full
                    bg-gradient-to-br from-primary-500 to-primary-700
                    flex items-center justify-center
                    shadow-[0_0_40px_rgba(99,102,241,0.45)]">
      <Shield size={36} className="text-white" />
    </div>

    {/* Title */}
    <h1 className="
      text-4xl md:text-5xl font-semibold tracking-tight
      text-white mb-4
    ">
      System Initialization Required
    </h1>

    {/* Subtitle */}
    <p className="
      text-lg md:text-xl
      text-slate-300/90
      leading-relaxed
      mb-10
    ">
      This environment has not been configured yet.
      Initialize the system by creating the first administrator account.
    </p>

    {/* CTA */}
    <button
      onClick={() => navigate('/bootstrap')}
      className="
        group inline-flex items-center gap-3
        px-8 py-4 rounded-full
        text-base font-semibold tracking-wide
        text-white
        bg-gradient-to-r from-primary-500 to-primary-700
        shadow-[0_10px_30px_rgba(99,102,241,0.35)]
        hover:shadow-[0_14px_45px_rgba(99,102,241,0.55)]
        transition-all duration-300
      "
    >
      Initialize System
      <ArrowRight
        size={18}
        className="transition-transform duration-300 group-hover:translate-x-1"
      />
    </button>

    {/* Subtle hint */}
    <p className="mt-6 text-sm text-slate-400">
      This action can only be performed once.
    </p>
  </div>
</div>
</div>
    );
  }

  /* -------------------- MAIN LANDING -------------------- */
  const roles = [
    {
      id: 'admin',
      title: 'Administrator',
      description:
        'System-wide control over materials, users, inventory, invoicing, and commissions.',
      icon: Shield,
      features: [
        'Define materials and pricing',
        'Approve SRNs and stock movements',
        'Generate and lock invoices',
        'Track commissions independently',
      ],
    },
    {
      id: 'manufacturer',
      title: 'Manufacturer',
      description:
        'Production execution and dispatch management without exposure to financial data.',
      icon: Factory,
      features: [
        'Record production batches',
        'Monitor available inventory',
        'Execute dispatch operations',
        'Operate within defined rules',
      ],
    },
    {
      id: 'retailer',
      title: 'Retailer',
      description:
        'Request stock, receive goods, and record sales within a controlled supply chain.',
      icon: Store,
      features: [
        'Create stock requests (SRNs)',
        'Confirm received goods (GRNs)',
        'Record sales transactions',
        'View issued invoices',
      ],
    },
  ];

  return (
    <div className="w-screen min-h-screen relative overflow-hidden text-white">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})` }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Content */}
      <div className="relative z-10">

        {/* Hero */}
        <section className="px-6 pt-36 pb-24">
          <div className="max-w-4xl mx-auto">
            <h1
              className="text-6xl md:text-7xl font-extrabold tracking-[0.18em] mb-6"
              style={{ textShadow: '0 12px 32px rgba(0,0,0,0.65)' }}
            >
              LIFECYCLE
            </h1>

            <h2
              className="text-3xl font-medium italic bg-gradient-to-r from-gray-100 via-white to-gray-700 bg-clip-text text-transparent"
              style={{ textShadow: '0 6px 20px rgba(0,0,0,0.55)' }}
            >
              Control the Entire Food Manufacturing Lifecycle
            </h2>
          </div>
        </section>

        {/* Roles */}
        <section className="px-6 pb-24">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-12">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  onClick={() =>
                    navigate('/login', { state: { role: role.id } })
                  }
                  className="text-left group"
                >
                  <div className="backdrop-blur-sm bg-slate-700/30 border border-white/10 rounded-xl p-6 h-full hover:border-white/20 transition">
                    <Icon size={36} className="text-primary-400 mb-4" />
                    <h4 className="text-3xl font-bold mb-2">
                      {role.title}
                    </h4>
                    <p className="text-slate-100 mb-4 leading-relaxed">
                      {role.description}
                    </p>

                    <ul className="space-y-2 text-slate-300">
                      {role.features.map((f, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary-400" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 flex items-center gap-2 text-primary-400 font-semibold">
                      Enter as {role.title}
                      <ArrowRight
                        size={16}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
