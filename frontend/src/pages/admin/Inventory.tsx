import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, EmptyState, StatCard } from '../../components/Layout';
import { usersApi } from '../../services/api';
import api from '../../services/api';
import { Warehouse, Package, Lock, Factory, Store, ChevronDown, ChevronRight } from 'lucide-react';

type ViewMode = 'manufacturer' | 'retailer';

// Types matching backend DTOs
interface ManufacturerInventoryReport {
  manufacturerId: string;
  manufacturerName: string;
  totalMaterials: number;
  totalPackets: number;
  blockedPackets: number;
  availablePackets: number;
  totalLooseUnits: number;
  blockedLooseUnits: number;
  availableLooseUnits: number;
}

interface ManufacturerDetailItem {
  materialId: string;
  sqCode: string;
  materialName: string;
  unitsPerPacket: number;
  totalPackets: number;
  blockedPackets: number;
  availablePackets: number;
  totalLooseUnits: number;
  blockedLooseUnits: number;
  availableLooseUnits: number;
}

interface ManufacturerDetailResponse {
  manufacturerId: string;
  manufacturerName: string;
  items: ManufacturerDetailItem[];
}

interface RetailerInventoryReport {
  retailerId: string;
  retailerName: string;
  totalMaterials: number;
  totalPackets: number;
  totalLooseUnits: number;
}

export default function AdminInventory() {
  const [viewMode, setViewMode] = useState<ViewMode>('manufacturer');
  const [expandedManufacturer, setExpandedManufacturer] = useState<string | null>(null);

  // Fetch manufacturer summary
  const { data: mfgSummary, isLoading: loadingMfg } = useQuery({
    queryKey: ['admin-mfg-inventory-summary'],
    queryFn: () => api.get<ManufacturerInventoryReport[]>('/admin/reports/inventory/by-manufacturer'),
  });

  // Fetch retailer summary
  const { data: retailerSummary, isLoading: loadingRetailer } = useQuery({
    queryKey: ['admin-retailer-inventory-summary'],
    queryFn: () => api.get<RetailerInventoryReport[]>('/admin/reports/inventory/retailers'),
  });

  // Fetch detail for expanded manufacturer
  const { data: mfgDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['admin-mfg-inventory-detail', expandedManufacturer],
    queryFn: () => api.get<ManufacturerDetailResponse>(`/admin/reports/inventory/manufacturer/${expandedManufacturer}`),
    enabled: !!expandedManufacturer,
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

  const mfgItems = mfgSummary?.data || [];
  const retailerItems = retailerSummary?.data || [];

  // Calculate totals for manufacturer inventory
  const mfgTotalAvailable = mfgItems.reduce((sum, item) => sum + item.availablePackets, 0);
  const mfgTotalBlocked = mfgItems.reduce((sum, item) => sum + item.blockedPackets, 0);
  const mfgTotalLoose = mfgItems.reduce((sum, item) => sum + item.totalLooseUnits, 0);
  const mfgTotalBlockedLoose = mfgItems.reduce((sum, item) => sum + item.blockedLooseUnits, 0);
  const mfgTotalMaterials = mfgItems.reduce((sum, item) => sum + item.totalMaterials, 0);

  // Calculate totals for retailer inventory
  const retailerTotalPackets = retailerItems.reduce((sum, item) => sum + item.totalPackets, 0);
  const retailerTotalLoose = retailerItems.reduce((sum, item) => sum + item.totalLooseUnits, 0);
  const retailerTotalMaterials = retailerItems.reduce((sum, item) => sum + item.totalMaterials, 0);

  const toggleManufacturer = (manufacturerId: string) => {
    setExpandedManufacturer(prev => prev === manufacturerId ? null : manufacturerId);
  };

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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
            <StatCard
              title="Manufacturers"
              value={mfgItems.length}
              icon={Factory}
            />
            <StatCard
              title="Total Materials"
              value={mfgTotalMaterials}
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
            <StatCard
              title="Loose Units"
              value={mfgTotalLoose}
              subtitle="Available"
              icon={Package}
            />
            <StatCard
              title="Blocked Loose"
              value={mfgTotalBlockedLoose}
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
                      <th></th>
                      <th>Manufacturer</th>
                      <th>Materials</th>
                      <th>Available Pkt</th>
                      <th>Blocked Pkt</th>
                      <th>Available Loose</th>
                      <th>Blocked Loose</th>
                      <th>Total Pkt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700">
                    {mfgItems.map((item) => (
                      <React.Fragment key={item.manufacturerId}>
                        <tr 
                          className="hover:bg-dark-800/50 cursor-pointer"
                          onClick={() => toggleManufacturer(item.manufacturerId)}
                        >
                          <td className="w-10">
                            {expandedManufacturer === item.manufacturerId ? (
                              <ChevronDown size={18} className="text-dark-400" />
                            ) : (
                              <ChevronRight size={18} className="text-dark-400" />
                            )}
                          </td>
                          <td className="font-medium text-white">{item.manufacturerName}</td>
                          <td>{item.totalMaterials}</td>
                          <td className="text-green-400">{item.availablePackets}</td>
                          <td className="text-yellow-400">
                            {item.blockedPackets > 0 ? (
                              <span className="flex items-center gap-1">
                                <Lock size={14} />
                                {item.blockedPackets}
                              </span>
                            ) : (
                              '0'
                            )}
                          </td>
                          <td className="text-green-400">{item.availableLooseUnits}</td>
                          <td className="text-yellow-400">
                            {item.blockedLooseUnits > 0 ? (
                              <span className="flex items-center gap-1">
                                <Lock size={14} />
                                {item.blockedLooseUnits}
                              </span>
                            ) : (
                              '0'
                            )}
                          </td>
                          <td className="text-white font-medium">{item.totalPackets}</td>
                        </tr>
                        {/* Expanded detail row */}
                        {expandedManufacturer === item.manufacturerId && (
                          <tr>
                            <td colSpan={8} className="bg-dark-800/30 p-0">
                              {loadingDetail ? (
                                <div className="p-4 text-center text-dark-400">Loading details...</div>
                              ) : mfgDetail?.data?.items?.length ? (
                                <table className="w-full">
                                  <thead className="bg-dark-900/50">
                                    <tr>
                                      <th className="pl-12">SQ Code</th>
                                      <th>Material</th>
                                      <th>Units/Pkt</th>
                                      <th>Available Pkt</th>
                                      <th>Blocked Pkt</th>
                                      <th>Available Loose</th>
                                      <th>Blocked Loose</th>
                                      <th>Total Pkt</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {mfgDetail.data.items.map((detail) => (
                                      <tr key={detail.materialId} className="text-sm">
                                        <td className="pl-12 text-dark-400">{detail.sqCode || '-'}</td>
                                        <td>{detail.materialName}</td>
                                        <td className="text-dark-400">{detail.unitsPerPacket}</td>
                                        <td className="text-green-400">{detail.availablePackets}</td>
                                        <td className="text-yellow-400">{detail.blockedPackets}</td>
                                        <td className="text-green-400">{detail.availableLooseUnits}</td>
                                        <td className="text-yellow-400">{detail.blockedLooseUnits}</td>
                                        <td>{detail.totalPackets}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="p-4 text-center text-dark-400">No inventory items</div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
              value={retailerItems.length}
              icon={Store}
            />
            <StatCard
              title="Materials Held"
              value={retailerTotalMaterials}
              icon={Package}
            />
            <StatCard
              title="Total Packets"
              value={retailerTotalPackets}
              subtitle="Across all retailers"
              icon={Warehouse}
            />
            <StatCard
              title="Total Loose Units"
              value={retailerTotalLoose}
              subtitle="Across all retailers"
              icon={Package}
            />
          </div>

          {/* Retailer Inventory Table */}
          {retailerItems.length === 0 ? (
            <Card>
              <EmptyState
                icon={Store}
                title="No Retailer Inventory"
                description="Retailers will have inventory once they confirm GRN deliveries."
              />
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-800">
                    <tr>
                      <th>Retailer</th>
                      <th>Materials</th>
                      <th>Total Packets</th>
                      <th>Loose Units</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700">
                    {retailerItems.map((item) => (
                      <tr key={item.retailerId} className="hover:bg-dark-800/50">
                        <td className="font-medium text-white">{item.retailerName}</td>
                        <td>{item.totalMaterials}</td>
                        <td className="text-green-400">{item.totalPackets}</td>
                        <td className="text-dark-300">{item.totalLooseUnits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </Layout>
  );
}