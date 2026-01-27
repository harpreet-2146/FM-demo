import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Layout, PageHeader, StatCard, LoadingSpinner, Card } from '../../components/Layout';
import { srnApi, materialsApi, usersApi, commissionApi } from '../../services/api';
import { Package, Users, ClipboardList, DollarSign, ArrowRight } from 'lucide-react';

export default function AdminDashboard() {
  const { data: materials, isLoading: loadingMaterials } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialsApi.getAll(true),
  });

  const { data: pendingSRNs } = useQuery({
    queryKey: ['srn-pending-count'],
    queryFn: () => srnApi.getPendingCount(),
  });

  const { data: manufacturers } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => usersApi.getManufacturers(),
  });

  const { data: retailers } = useQuery({
    queryKey: ['retailers'],
    queryFn: () => usersApi.getRetailers(),
  });

  const { data: commissionSummary } = useQuery({
    queryKey: ['commission-summary'],
    queryFn: () => commissionApi.getSummary(),
  });

  if (loadingMaterials) {
    return <Layout><LoadingSpinner /></Layout>;
  }

  const activeMaterials = materials?.data?.filter(m => m.isActive) || [];
  const pendingCount = pendingSRNs?.data?.count || 0;
  const pendingCommission = commissionSummary?.data?.pendingAmount || 0;

  return (
    <Layout>
      <PageHeader
        title="Admin Dashboard"
        subtitle="System overview and quick actions"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Materials"
          value={activeMaterials.length}
          icon={Package}
        />
        <StatCard
          title="Pending SRNs"
          value={pendingCount}
          subtitle={pendingCount > 0 ? 'Requires attention' : 'All clear'}
          icon={ClipboardList}
        />
        <StatCard
          title="Active Users"
          value={(manufacturers?.data?.length || 0) + (retailers?.data?.length || 0)}
          subtitle={`${manufacturers?.data?.length || 0} mfr, ${retailers?.data?.length || 0} retailers`}
          icon={Users}
        />
        <StatCard
          title="Pending Commission"
          value={`₹${pendingCommission.toFixed(2)}`}
          icon={DollarSign}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to="/admin/materials"
              className="flex items-center justify-between p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-white">Manage Materials</span>
              <ArrowRight size={20} className="text-dark-400" />
            </Link>
            <Link
              to="/admin/requests"
              className="flex items-center justify-between p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-white">
                Review SRNs
                {pendingCount > 0 && (
                  <span className="ml-2 badge badge-warning">{pendingCount}</span>
                )}
              </span>
              <ArrowRight size={20} className="text-dark-400" />
            </Link>
            <Link
              to="/admin/users"
              className="flex items-center justify-between p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-white">Manage Users</span>
              <ArrowRight size={20} className="text-dark-400" />
            </Link>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">System Rules</h3>
          <ul className="space-y-2 text-dark-300 text-sm">
            <li>• <strong>No hardcoded data</strong> - All values from Admin UI</li>
            <li>• <strong>unitsPerPacket</strong> - Immutable after creation</li>
            <li>• <strong>HSN/GST</strong> - Locked after first production</li>
            <li>• <strong>Invoices</strong> - Immutable after generation</li>
            <li>• <strong>Inventory changes</strong> - Only via Production, Dispatch, GRN, Sale</li>
          </ul>
        </Card>
      </div>

      {/* Recent Materials */}
      {activeMaterials.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Package size={48} className="mx-auto text-dark-500 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Materials Yet</h3>
            <p className="text-dark-400 mb-4">
              Start by creating your first material to enable the system.
            </p>
            <Link to="/admin/materials" className="btn btn-primary">
              Create Material
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Materials</h3>
            <Link to="/admin/materials" className="text-primary-500 hover:text-primary-400 text-sm">
              View All →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th>Name</th>
                  <th>HSN</th>
                  <th>GST</th>
                  <th>Units/Pkt</th>
                  <th>MRP</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {activeMaterials.slice(0, 5).map((material) => (
                  <tr key={material.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{material.name}</td>
                    <td>{material.hsnCode}</td>
                    <td>{material.gstRate}%</td>
                    <td>{material.unitsPerPacket}</td>
                    <td>₹{material.mrpPerPacket}</td>
                    <td>
                      {material.hasProduction ? (
                        <span className="badge badge-success">In Production</span>
                      ) : (
                        <span className="badge badge-gray">New</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Layout>
  );
}