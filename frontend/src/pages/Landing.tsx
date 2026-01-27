import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Factory, Store, ArrowRight } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { user, isBootstrapped, isLoading } = useAuth();

  useEffect(() => {
    // If user is logged in, redirect to their dashboard
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
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="w-12 h-12 border-2 border-dark-600 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  // If not bootstrapped, show bootstrap prompt
  if (isBootstrapped === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-dark-950">
        <div className="text-center max-w-lg">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-600 mb-6">
            <Shield size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Welcome to Food Manufacturing SaaS
          </h1>
          <p className="text-dark-400 mb-8">
            This system has not been initialized yet. Create the first administrator account to get started.
          </p>
          <button
            onClick={() => navigate('/bootstrap')}
            className="btn btn-primary btn-lg flex items-center gap-2 mx-auto"
          >
            Initialize System
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  const roles = [
    {
      id: 'admin',
      title: 'Administrator',
      description: 'Full system access, user management, inventory oversight',
      icon: Shield,
      color: 'from-purple-600 to-purple-800',
      features: ['Manage Materials', 'Approve SRNs', 'Generate Invoices', 'Track Commissions'],
    },
    {
      id: 'manufacturer',
      title: 'Manufacturer',
      description: 'Production batches and dispatch management',
      icon: Factory,
      color: 'from-blue-600 to-blue-800',
      features: ['Record Production', 'View Inventory', 'Execute Dispatch', 'No Financial Data'],
    },
    {
      id: 'retailer',
      title: 'Retailer',
      description: 'Request stock, receive goods, record sales',
      icon: Store,
      color: 'from-green-600 to-green-800',
      features: ['Create SRNs', 'Confirm GRNs', 'Record Sales', 'View Invoices'],
    },
  ];

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary-500">FoodMfg SaaS</h1>
          <span className="text-dark-400 text-sm">Zero Hardcoding Architecture</span>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Food Manufacturing
            <br />
            <span className="text-primary-500">Inventory Management</span>
          </h2>
          <p className="text-xl text-dark-400 mb-8 max-w-2xl mx-auto">
            Complete supply chain management with production tracking, SRN workflow, GST-compliant invoicing, and commission management.
          </p>
        </div>
      </section>

      {/* Role Selection */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-semibold text-white text-center mb-8">
            Select your role to login
          </h3>

          <div className="grid md:grid-cols-3 gap-6">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  onClick={() => navigate('/login', { state: { role: role.id } })}
                  className="group text-left"
                >
                  <div className={`bg-gradient-to-br ${role.color} rounded-2xl p-6 mb-4 transition-transform group-hover:scale-[1.02]`}>
                    <Icon size={48} className="text-white/80 mb-4" />
                    <h4 className="text-xl font-bold text-white mb-2">{role.title}</h4>
                    <p className="text-white/70 text-sm">{role.description}</p>
                  </div>
                  <div className="card">
                    <ul className="space-y-2">
                      {role.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-dark-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex items-center gap-2 text-primary-500 font-medium">
                      Login as {role.title}
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-800 p-6">
        <div className="max-w-6xl mx-auto text-center text-dark-500 text-sm">
          <p>All business data is Admin-defined. No hardcoded defaults.</p>
          <p className="mt-1">HSN/GST locked after production • Invoices immutable • Commission decoupled from Invoice</p>
        </div>
      </footer>
    </div>
  );
}