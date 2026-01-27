import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Layout, PageHeader, StatCard, LoadingSpinner, Card } from '../../components/Layout';
import { productionApi, manufacturerInventoryApi, dispatchApi } from '../../services/api';
import { Factory, Package, Truck, ArrowRight, Warehouse } from 'lucide-react';

export default function ManufacturerDashboard() {
  const { data: productionSummary, isLoading: loadingProduction } = useQuery({
    queryKey: ['production-summary'],
    queryFn: () => productionApi.getSummary(),
  });

  const { data: inventory, isLoading: loadingInventory } = useQuery({
    queryKey: ['manufacturer-inventory'],
    queryFn: () => manufacturerInventoryApi.getMyInventory(),
  });

  const { data: dispatches } = useQuery({
    queryKey: ['my-dispatches'],
    queryFn: () => dispatchApi.getMy(),
  });

  if (loadingProduction || loadingInventory) {
    return <Layout><LoadingSpinner /></Layout>;
  }

  const production = productionSummary?.data;
  const inv = inventory?.data;
  const pendingDispatches = dispatches?.data?.filter(d => d.status === 'PENDING') || [];

  return (
    <Layout>
      <PageHeader
        title="Manufacturer Dashboard"
        subtitle="Production, inventory, and dispatch management"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Batches"
          value={production?.totalBatches || 0}
          icon={Factory}
        />
        <StatCard
          title="Packets Produced"
          value={production?.totalPacketsProduced || 0}
          icon={Package}
        />
        <StatCard
          title="Available Inventory"
          value={inv?.totalAvailablePackets || 0}
          subtitle={`${inv?.totalBlockedPackets || 0} blocked`}
          icon={Warehouse}
        />
        <StatCard
          title="Pending Dispatches"
          value={pendingDispatches.length}
          subtitle={pendingDispatches.length > 0 ? 'Action required' : 'All clear'}
          icon={Truck}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to="/manufacturer/production"
              className="flex items-center justify-between p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-white">Record Production Batch</span>
              <ArrowRight size={20} className="text-dark-400" />
            </Link>
            <Link
              to="/manufacturer/inventory"
              className="flex items-center justify-between p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-white">View Inventory</span>
              <ArrowRight size={20} className="text-dark-400" />
            </Link>
            <Link
              to="/manufacturer/dispatch"
              className="flex items-center justify-between p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-white">
                Execute Dispatches
                {pendingDispatches.length > 0 && (
                  <span className="ml-2 badge badge-warning">{pendingDispatches.length}</span>
                )}
              </span>
              <ArrowRight size={20} className="text-dark-400" />
            </Link>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Role Notes</h3>
          <ul className="space-y-2 text-dark-300 text-sm">
            <li>• You can only see <strong>quantity data</strong> - no prices</li>
            <li>• Record production batches to add inventory</li>
            <li>• Blocked packets are reserved for approved SRNs</li>
            <li>• Execute dispatch to ship goods to retailers</li>
            <li>• Commission & invoice data is hidden from you</li>
          </ul>
        </Card>
      </div>

      {/* Recent Production Batches */}
      {production?.recentBatches && production.recentBatches.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Production</h3>
            <Link to="/manufacturer/production" className="text-primary-500 hover:text-primary-400 text-sm">
              View All →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th>Batch #</th>
                  <th>Material</th>
                  <th>Packets</th>
                  <th>Mfg Date</th>
                  <th>Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {production.recentBatches.slice(0, 5).map((batch) => (
                  <tr key={batch.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{batch.batchNumber}</td>
                    <td>{batch.materialName}</td>
                    <td>{batch.packetsProduced}</td>
                    <td>{new Date(batch.manufactureDate).toLocaleDateString()}</td>
                    <td>{new Date(batch.expiryDate).toLocaleDateString()}</td>
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