import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, EmptyState, StatCard } from '../../components/Layout';
import { manufacturerInventoryApi } from '../../services/api';
import { Warehouse, Package, Lock } from 'lucide-react';

export default function ManufacturerInventory() {
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['manufacturer-inventory'],
    queryFn: () => manufacturerInventoryApi.getMyInventory(),
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const inv = inventory?.data;
  const items = inv?.items || [];

  return (
    <Layout>
      <PageHeader
        title="Inventory"
        subtitle="Your current inventory - Available and blocked packets"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Materials"
          value={inv?.totalMaterials || 0}
          icon={Package}
        />
        <StatCard
          title="Available Packets"
          value={inv?.totalAvailablePackets || 0}
          subtitle="Ready for dispatch"
          icon={Warehouse}
        />
        <StatCard
          title="Blocked Packets"
          value={inv?.totalBlockedPackets || 0}
          subtitle="Reserved for approved SRNs"
          icon={Lock}
        />
      </div>

      {/* Inventory Table */}
      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Warehouse}
            title="No Inventory"
            description="Record production batches to add packets to your inventory."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th>Material</th>
                  <th>Available</th>
                  <th>Blocked</th>
                  <th>Total</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{item.materialName}</td>
                    <td className="text-green-400">{item.availablePackets} pkt</td>
                    <td className="text-yellow-400">
                      {item.blockedPackets > 0 ? (
                        <span className="flex items-center gap-1">
                          <Lock size={14} />
                          {item.blockedPackets} pkt
                        </span>
                      ) : (
                        '0 pkt'
                      )}
                    </td>
                    <td className="text-white font-medium">{item.totalPackets} pkt</td>
                    <td className="text-dark-400">{new Date(item.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Info Card */}
      <div className="mt-6">
        <Card>
          <h3 className="text-lg font-semibold text-white mb-3">Inventory Flow</h3>
          <div className="space-y-2 text-sm text-dark-300">
            <p><span className="text-green-400">+</span> <strong>Production:</strong> Adds packets to available inventory</p>
            <p><span className="text-yellow-400">⟳</span> <strong>SRN Approval:</strong> Moves packets from available to blocked</p>
            <p><span className="text-red-400">−</span> <strong>Dispatch Execution:</strong> Removes blocked packets from inventory</p>
          </div>
        </Card>
      </div>
    </Layout>
  );
}