import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, EmptyState, StatCard } from '../../components/Layout';
import { manufacturerInventoryApi, retailerInventoryApi, usersApi } from '../../services/api';
import { Warehouse, Package, Lock, Factory, Store } from 'lucide-react';

type ViewMode = 'manufacturer' | 'retailer';

export default function AdminInventory() {
  const [viewMode, setViewMode] = useState<ViewMode>('manufacturer');

  const { data: mfgInventory, isLoading: loadingMfg } = useQuery({
    queryKey: ['all-manufacturer-inventory'],
    queryFn: () => manufacturerInventoryApi.getAll(),
  });

  const { data: retailerInventory, isLoading: loadingRetailer } = useQuery({
    queryKey: ['all-retailer-inventory'],
    queryFn: () => retailerInventoryApi.getAll(),
  });

  const { data: manufacturers } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => usersApi.getManufacturers(),
  });

  const { data: retailers } = useQuery({
    queryKey: ['retailers'],
    queryFn: () => usersApi.getRetailers(),
  });

  const isLoading = loadingMfg || loadingRetailer;

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const mfgItems = mfgInventory?.data || [];
  const retailerItems = retailerInventory?.data || [];

  // Calculate totals for manufacturer inventory
  const mfgTotalAvailable = mfgItems.reduce((sum, item) => sum + item.availablePackets, 0);
  const mfgTotalBlocked = mfgItems.reduce((sum, item) => sum + item.blockedPackets, 0);

  // Calculate totals for retailer inventory
  const retailerTotalPackets = retailerItems.reduce((sum, item) => sum + item.fullPackets, 0);
  const retailerTotalLoose = retailerItems.reduce((sum, item) => sum + item.looseUnits, 0);

  return (
    <Layout>
      <PageHeader
        title="Inventory Overview"
        subtitle="Admin view of all inventory across manufacturers and retailers"
      />

      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setViewMode('manufacturer')}
          className={`btn flex items-center gap-2 ${viewMode === 'manufacturer' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Factory size={18} />
          Manufacturer Inventory
        </button>
        <button
          onClick={() => setViewMode('retailer')}
          className={`btn flex items-center gap-2 ${viewMode === 'retailer' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Store size={18} />
          Retailer Inventory
        </button>
      </div>

      {viewMode === 'manufacturer' ? (
        <>
          {/* Manufacturer Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Manufacturers"
              value={manufacturers?.data?.length || 0}
              icon={Factory}
            />
            <StatCard
              title="Total Materials"
              value={new Set(mfgItems.map(i => i.materialId)).size}
              icon={Package}
            />
            <StatCard
              title="Available Packets"
              value={mfgTotalAvailable}
              subtitle="Ready for dispatch"
              icon={Warehouse}
            />
            <StatCard
              title="Blocked Packets"
              value={mfgTotalBlocked}
              subtitle="Reserved for SRNs"
              icon={Lock}
            />
          </div>

          {/* Manufacturer Inventory Table */}
          {mfgItems.length === 0 ? (
            <Card>
              <EmptyState
                icon={Warehouse}
                title="No Manufacturer Inventory"
                description="Manufacturers need to record production batches to create inventory."
              />
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-800">
                    <tr>
                      <th>Manufacturer</th>
                      <th>Material</th>
                      <th>Available</th>
                      <th>Blocked</th>
                      <th>Total</th>
                      <th>Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700">
                    {mfgItems.map((item) => (
                      <tr key={item.id} className="hover:bg-dark-800/50">
                        <td className="font-medium text-white">{item.manufacturerName || 'Unknown'}</td>
                        <td>{item.materialName}</td>
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
        </>
      ) : (
        <>
          {/* Retailer Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Retailers"
              value={retailers?.data?.length || 0}
              icon={Store}
            />
            <StatCard
              title="Total Materials"
              value={new Set(retailerItems.map(i => i.materialId)).size}
              icon={Package}
            />
            <StatCard
              title="Full Packets"
              value={retailerTotalPackets}
              subtitle="Unopened"
              icon={Package}
            />
            <StatCard
              title="Loose Units"
              value={retailerTotalLoose}
              subtitle="From opened packets"
              icon={Warehouse}
            />
          </div>

          {/* Retailer Inventory Table */}
          {retailerItems.length === 0 ? (
            <Card>
              <EmptyState
                icon={Warehouse}
                title="No Retailer Inventory"
                description="Retailers receive inventory when they confirm GRNs."
              />
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-800">
                    <tr>
                      <th>Retailer</th>
                      <th>Material</th>
                      <th>Full Packets</th>
                      <th>Loose Units</th>
                      <th>Total Units</th>
                      <th>Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700">
                    {retailerItems.map((item) => (
                      <tr key={item.id} className="hover:bg-dark-800/50">
                        <td className="font-medium text-white">{item.retailerName || 'Unknown'}</td>
                        <td>{item.materialName}</td>
                        <td className="text-green-400">{item.fullPackets} pkt</td>
                        <td className="text-yellow-400">{item.looseUnits} units</td>
                        <td className="text-white font-medium">{item.totalUnits} units</td>
                        <td className="text-dark-400">{new Date(item.updatedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Info Card */}
      <div className="mt-6">
        <Card>
          <h3 className="text-lg font-semibold text-white mb-3">Inventory Flow</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary-500 mb-2">Manufacturer Flow</h4>
              <div className="space-y-2 text-sm text-dark-300">
                <p><span className="text-green-400">+</span> <strong>Production:</strong> Adds to available</p>
                <p><span className="text-yellow-400">⟳</span> <strong>SRN Approval:</strong> Available → Blocked</p>
                <p><span className="text-red-400">−</span> <strong>Dispatch:</strong> Removes blocked</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-primary-500 mb-2">Retailer Flow</h4>
              <div className="space-y-2 text-sm text-dark-300">
                <p><span className="text-green-400">+</span> <strong>GRN Confirm:</strong> Adds packets</p>
                <p><span className="text-yellow-400">⟳</span> <strong>Sale:</strong> Opens packets → loose units</p>
                <p><span className="text-red-400">−</span> <strong>Sale:</strong> Deducts units</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}