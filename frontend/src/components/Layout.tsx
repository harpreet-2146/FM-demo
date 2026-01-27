import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  FileText,
  Truck,
  Receipt,
  DollarSign,
  Users,
  LogOut,
  Factory,
  ShoppingCart,
  ClipboardList,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

const adminNav: NavItem[] = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/materials', label: 'Materials', icon: Package },
  { path: '/admin/inventory', label: 'Inventory', icon: Warehouse },
  { path: '/admin/requests', label: 'Requests', icon: ClipboardList },
  { path: '/admin/dispatch', label: 'Dispatch', icon: Truck },
  { path: '/admin/invoices', label: 'Invoices', icon: Receipt },
  { path: '/admin/commission', label: 'Commission', icon: DollarSign },
  { path: '/admin/users', label: 'Users', icon: Users },
];

const manufacturerNav: NavItem[] = [
  { path: '/manufacturer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/manufacturer/production', label: 'Production', icon: Factory },
  { path: '/manufacturer/inventory', label: 'Inventory', icon: Warehouse },
  { path: '/manufacturer/dispatch', label: 'Dispatch', icon: Truck },
];

const retailerNav: NavItem[] = [
  { path: '/retailer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/retailer/catalog', label: 'Catalog', icon: Package },
  { path: '/retailer/requests', label: 'Requests', icon: ClipboardList },
  { path: '/retailer/receiving', label: 'Receiving', icon: Truck },
  { path: '/retailer/sales', label: 'Sales', icon: ShoppingCart },
  { path: '/retailer/invoices', label: 'Invoices', icon: Receipt },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const navItems = React.useMemo(() => {
    switch (user?.role) {
      case 'ADMIN':
        return adminNav;
      case 'MANUFACTURER':
        return manufacturerNav;
      case 'RETAILER':
        return retailerNav;
      default:
        return [];
    }
  }, [user?.role]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-dark-800"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-dark-900 border-r border-dark-700
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-dark-700">
            <h1 className="text-xl font-bold text-primary-500">FoodMfg SaaS</h1>
            <p className="text-xs text-dark-400 mt-1">{user?.role} Portal</p>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-300 hover:bg-dark-800 hover:text-white'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-dark-700">
            <div className="mb-4">
              <p className="font-medium text-white">{user?.name}</p>
              <p className="text-sm text-dark-400">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2 text-red-400 hover:bg-dark-800 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-dark-400 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex justify-center items-center p-8">
      <div className={`${sizeClasses[size]} border-2 border-dark-600 border-t-primary-500 rounded-full animate-spin`} />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="text-center py-12">
      {Icon && <div className="flex justify-center mb-4"><Icon size={48} className="text-dark-500" /></div>}
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-dark-400 mb-6 max-w-md mx-auto">{description}</p>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    DRAFT: 'badge-gray', SUBMITTED: 'badge-info', APPROVED: 'badge-success',
    PARTIAL: 'badge-warning', REJECTED: 'badge-danger', PENDING: 'badge-warning',
    IN_TRANSIT: 'badge-info', DELIVERED: 'badge-success', CONFIRMED: 'badge-success',
    DISPUTED: 'badge-danger', PAID: 'badge-success',
  };
  return <span className={`badge ${statusStyles[status] || 'badge-gray'}`}>{status.replace(/_/g, ' ')}</span>;
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function StatCard({ title, value, subtitle, icon: Icon }: { title: string; value: string | number; subtitle?: string; icon?: React.ElementType }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-dark-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-dark-500 text-xs mt-1">{subtitle}</p>}
        </div>
        {Icon && <Icon size={24} className="text-primary-500" />}
      </div>
    </Card>
  );
}

export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-dark-900 rounded-xl border border-dark-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white"><X size={24} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DataTable<T>({ columns, data, keyField, emptyMessage = 'No data available' }: {
  columns: { key: string; header: string; render?: (row: T) => React.ReactNode }[];
  data: T[];
  keyField: keyof T;
  emptyMessage?: string;
}) {
  if (data.length === 0) {
    return <div className="text-center py-8 text-dark-400">{emptyMessage}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-dark-800">
          <tr>{columns.map(col => <th key={col.key}>{col.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-dark-700">
          {data.map((row) => (
            <tr key={String(row[keyField])} className="hover:bg-dark-800/50">
              {columns.map(col => (
                <td key={col.key}>{col.render ? col.render(row) : String((row as any)[col.key] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}