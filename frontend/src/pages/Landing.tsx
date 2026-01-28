import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Factory, Store, ArrowRight } from 'lucide-react';
//import bgImage from '../assets/landing.webp';
import bgImage from "../assets/bg.webp";
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
      }
    }
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (isBootstrapped === false) {
    return (
      <div
  className="min-h-screen bg-center bg-no-repeat flex items-center justify-center"
  style={{
    backgroundImage: `url(${bgImage})`,
  }}
>

        <div className="text-center max-w-lg px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-600 mb-6">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-white mb-4">
            System Initialization Required
          </h1>
          <p className="text-slate-300 mb-8 leading-relaxed">
            This system has not been initialized yet.
            Create the first administrator account to begin configuration.
          </p>
          <button
            onClick={() => navigate('/bootstrap')}
            className="inline-flex items-center gap-2 text-primary-400 font-medium hover:underline"
          >
            Initialize System
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

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
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat text-white"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      
      {/* Hero */}
      <section className="relative px-4 pt-36 pb-24 overflow-hidden">
  <div className="max-w-4xl mx-auto">

    {/* ORCHESTRA */}
    <h1
      className="
        text-6xl md:text-7xl font-extrabold tracking-[0.18em]
        text-white mb-6
        opacity-0 animate-[fadeUp_0.9s_ease-out_forwards]
      "
      style={{
        textShadow: "0 12px 32px rgba(0,0,0,0.65)",
      }}
    >
      LIFECYCLE
    </h1>

    {/* Tagline */}
    <h2
      className="
        text-3xl md:text-3xl font-medium italic
        bg-gradient-to-r from-gray-100 via-white to-gray-700
        bg-clip-text text-transparent
        opacity-0 animate-[fadeUp_0.9s_ease-out_0.2s_forwards]
      "
      style={{
        textShadow: "0 6px 20px rgba(0,0,0,0.55)",
      }}
    >
      Control the Entire Food Manufacturing Lifecycle
    </h2>

    {/* Inline keyframes */}
    <style jsx>{`
      @keyframes fadeUp {
        from {
          opacity: 0;
          transform: translateY(24px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `}</style>

  </div>
</section>


            {/* Role Selection */}
      <section className="px-4 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-12">
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
                    <p className="text-medium text-slate-100 mb-4 leading-relaxed">
                      {role.description}
                    </p>

                    <ul className="space-y-2 text-medium text-slate-300">
                      {role.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-400" />
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
        </div>
      </section>
    </div>
  );
}

