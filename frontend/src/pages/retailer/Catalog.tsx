import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, EmptyState } from '../../components/Layout';
import { materialsApi } from '../../services/api';
import { Package } from 'lucide-react';

export default function RetailerCatalog() {
  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialsApi.getAll(),
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const materialList = materials?.data || [];

  return (
    <Layout>
      <PageHeader
        title="Product Catalog"
        subtitle="Browse available materials to request"
      />

      {materialList.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title="No Materials Available"
            description="Admin needs to add materials to the catalog."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materialList.map((material) => (
            <Card key={material.id}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white">{material.name}</h3>
                  <p className="text-sm text-dark-400">HSN: {material.hsnCode}</p>
                </div>
                {material.hasProduction ? (
                  <span className="badge badge-success">Available</span>
                ) : (
                  <span className="badge badge-gray">Coming Soon</span>
                )}
              </div>

              {material.description && (
                <p className="text-sm text-dark-400 mb-4">{material.description}</p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-400">MRP per Packet</span>
                  <span className="text-white">₹{material.mrpPerPacket.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Units per Packet</span>
                  <span className="text-white">{material.unitsPerPacket}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Unit Price</span>
                  <span className="text-primary-500">₹{material.unitPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">GST</span>
                  <span className="text-white">{material.gstRate}%</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-dark-700">
                  <span className="text-dark-400">Commission</span>
                  <span className="text-green-400">
                    {material.commissionType === 'PERCENTAGE'
                      ? `${material.commissionValue}%`
                      : `₹${material.commissionValue}/unit`}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}