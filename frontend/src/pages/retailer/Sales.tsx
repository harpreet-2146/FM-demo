import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatCard } from '../../components/Layout';
import { saleApi, retailerInventoryApi } from '../../services/api';
import type { CreateSaleDto } from '../../types';
import { ShoppingCart, Plus, DollarSign, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RetailerSales() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: () => saleApi.getSummary(),
  });

  const { data: inventory } = useQuery({
    queryKey: ['retailer-inventory'],
    queryFn: () => retailerInventoryApi.getMyInventory(),
  });

  const createMutation = useMutation({
    mutationFn: saleApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
      queryClient.invalidateQueries({ queryKey: ['retailer-inventory'] });
      setIsModalOpen(false);
      toast.success('Sale recorded successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record sale');
    },
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const salesData = summary?.data;
  const invItems = inventory?.data?.items || [];

  return (
    <Layout>
      <PageHeader
        title="Sales"
        subtitle="Record B2C unit sales - auto-opens packets when needed"
        action={
          invItems.length > 0 && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Record Sale
            </button>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Sales"
          value={salesData?.totalSales || 0}
          icon={ShoppingCart}
        />
        <StatCard
          title="Units Sold"
          value={salesData?.totalUnitsSold || 0}
          icon={Package}
        />
        <StatCard
          title="Total Revenue"
          value={`₹${(salesData?.totalRevenue || 0).toFixed(2)}`}
          icon={DollarSign}
        />
      </div>

      {/* Recent Sales */}
      {salesData?.recentSales && salesData.recentSales.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-dark-700">
            <h3 className="font-semibold text-white">Recent Sales</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th>Sale #</th>
                  <th>Material</th>
                  <th>Units</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                  <th>Packets Opened</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {salesData.recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{sale.saleNumber}</td>
                    <td>{sale.materialName}</td>
                    <td>{sale.unitsSold}</td>
                    <td>₹{sale.unitPrice.toFixed(2)}</td>
                    <td className="text-primary-500">₹{sale.totalAmount.toFixed(2)}</td>
                    <td>
                      {sale.packetsOpened > 0 ? (
                        <span className="text-yellow-400">{sale.packetsOpened}</span>
                      ) : (
                        <span className="text-dark-500">-</span>
                      )}
                    </td>
                    <td>{new Date(sale.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={ShoppingCart}
            title="No Sales Yet"
            description={invItems.length > 0
              ? "Record your first sale to start tracking revenue."
              : "You need inventory before you can record sales. Confirm GRN receipts first."
            }
            action={
              invItems.length > 0 && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="btn btn-primary"
                >
                  Record First Sale
                </button>
              )
            }
          />
        </Card>
      )}

      {/* Info Card */}
      <div className="mt-6">
        <Card>
          <h3 className="text-lg font-semibold text-white mb-3">How Sales Work</h3>
          <ul className="space-y-2 text-sm text-dark-300">
            <li>• Units are deducted from your inventory</li>
            <li>• If loose units are insufficient, packets are auto-opened</li>
            <li>• Commission is auto-calculated based on material settings</li>
            <li>• Commission is decoupled from invoices</li>
          </ul>
        </Card>
      </div>

      {/* Create Sale Modal */}
      <CreateSaleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        inventory={invItems}
        onCreate={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </Layout>
  );
}

function CreateSaleModal({
  isOpen,
  onClose,
  inventory,
  onCreate,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  inventory: { materialId: string; materialName: string; totalUnits: number; fullPackets: number; looseUnits: number; unitsPerPacket: number }[];
  onCreate: (data: CreateSaleDto) => void;
  isLoading: boolean;
}) {
  const [materialId, setMaterialId] = useState('');
  const [unitsSold, setUnitsSold] = useState('');

  const selectedInventory = inventory.find((i) => i.materialId === materialId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!materialId || !unitsSold) {
      toast.error('All fields required');
      return;
    }

    const units = parseInt(unitsSold);
    if (units <= 0) {
      toast.error('Units must be positive');
      return;
    }

    if (selectedInventory && units > selectedInventory.totalUnits) {
      toast.error('Insufficient inventory');
      return;
    }

    onCreate({ materialId, unitsSold: units });
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Sale">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Material *</label>
          <select
            className="form-input"
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            required
          >
            <option value="">Select material...</option>
            {inventory.map((item) => (
              <option key={item.materialId} value={item.materialId}>
                {item.materialName} ({item.totalUnits} units available)
              </option>
            ))}
          </select>
        </div>

        {selectedInventory && (
          <div className="bg-dark-800 rounded-lg p-3 text-sm">
            <p className="text-dark-400">
              Available: <span className="text-white">{selectedInventory.totalUnits} units</span>
            </p>
            <p className="text-dark-400">
              ({selectedInventory.fullPackets} packets × {selectedInventory.unitsPerPacket} + {selectedInventory.looseUnits} loose)
            </p>
          </div>
        )}

        <div>
          <label className="form-label">Units to Sell *</label>
          <input
            type="number"
            min="1"
            max={selectedInventory?.totalUnits}
            className="form-input"
            placeholder="e.g., 5"
            value={unitsSold}
            onChange={(e) => setUnitsSold(e.target.value)}
            required
          />
        </div>

        {selectedInventory && unitsSold && parseInt(unitsSold) > selectedInventory.looseUnits && (
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-400">
              <strong>Note:</strong> This will auto-open {Math.ceil((parseInt(unitsSold) - selectedInventory.looseUnits) / selectedInventory.unitsPerPacket)} packet(s)
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">
            {isLoading ? 'Recording...' : 'Record Sale'}
          </button>
        </div>
      </form>
    </Modal>
  );
}