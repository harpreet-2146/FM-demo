import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatusBadge } from '../../components/Layout';
import { grnApi } from '../../services/api';
import type { GRN, ConfirmGRNDto } from '../../types';
import { Truck, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RetailerReceiving() {
  const queryClient = useQueryClient();
  const [selectedGRN, setSelectedGRN] = useState<GRN | null>(null);

  const { data: grns, isLoading } = useQuery({
    queryKey: ['my-grns'],
    queryFn: () => grnApi.getMy(),
  });

  const confirmMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConfirmGRNDto }) =>
      grnApi.confirm(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-grns'] });
      queryClient.invalidateQueries({ queryKey: ['retailer-inventory'] });
      setSelectedGRN(null);
      toast.success('GRN confirmed - goods added to inventory');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to confirm GRN');
    },
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const grnList = grns?.data || [];
  const pendingGRNs = grnList.filter(g => g.status === 'PENDING');
  const confirmedGRNs = grnList.filter(g => g.status === 'CONFIRMED');

  return (
    <Layout>
      <PageHeader
        title="Goods Receipt"
        subtitle="Confirm receipt of dispatched goods"
      />

      {/* Pending GRNs */}
      {pendingGRNs.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="badge badge-warning">Action Required</span>
            Pending Receipts
          </h3>
          <div className="grid gap-4">
            {pendingGRNs.map((grn) => (
              <Card key={grn.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white">{grn.grnNumber}</h4>
                    <p className="text-sm text-dark-400">
                      Dispatch: {grn.dispatchNumber}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedGRN(grn)}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <CheckCircle size={16} />
                    Confirm Receipt
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-dark-700">
                  <p className="text-xs text-dark-400 mb-2">Expected Items:</p>
                  <div className="flex flex-wrap gap-2">
                    {grn.items.map((item) => (
                      <span key={item.id} className="badge badge-gray">
                        {item.materialName}: {item.expectedPackets} pkt
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed GRNs */}
      {confirmedGRNs.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Confirmed Receipts</h3>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-800">
                  <tr>
                    <th>GRN #</th>
                    <th>Dispatch #</th>
                    <th>Items</th>
                    <th>Confirmed</th>
                    <th>Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {confirmedGRNs.map((grn) => (
                    <tr key={grn.id} className="hover:bg-dark-800/50">
                      <td className="font-medium text-white">{grn.grnNumber}</td>
                      <td>{grn.dispatchNumber}</td>
                      <td>{grn.items.length} item(s)</td>
                      <td>{grn.confirmedAt ? new Date(grn.confirmedAt).toLocaleDateString() : '-'}</td>
                      <td>
                        {grn.hasInvoice ? (
                          <span className="badge badge-success">Generated</span>
                        ) : (
                          <span className="badge badge-gray">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {grnList.length === 0 && (
        <Card>
          <EmptyState
            icon={Truck}
            title="No Goods to Receive"
            description="You will see GRNs here when dispatches are sent to you."
          />
        </Card>
      )}

      {/* Confirm Modal */}
      {selectedGRN && (
        <ConfirmGRNModal
          grn={selectedGRN}
          onClose={() => setSelectedGRN(null)}
          onConfirm={(data) => confirmMutation.mutate({ id: selectedGRN.id, data })}
          isLoading={confirmMutation.isPending}
        />
      )}
    </Layout>
  );
}

function ConfirmGRNModal({
  grn,
  onClose,
  onConfirm,
  isLoading,
}: {
  grn: GRN;
  onClose: () => void;
  onConfirm: (data: ConfirmGRNDto) => void;
  isLoading: boolean;
}) {
  const [items, setItems] = useState(
    grn.items.map((item) => ({
      materialId: item.materialId,
      receivedPackets: item.expectedPackets,
      damagedPackets: 0,
    }))
  );
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    for (let i = 0; i < items.length; i++) {
      if (items[i].damagedPackets > items[i].receivedPackets) {
        toast.error('Damaged cannot exceed received');
        return;
      }
    }

    onConfirm({ items, notes: notes || undefined });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Confirm GRN ${grn.grnNumber}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-dark-800 rounded-lg p-4">
          <p className="text-sm">
            <span className="text-dark-400">Dispatch:</span>
            <span className="ml-2 text-white">{grn.dispatchNumber}</span>
          </p>
        </div>

        <div>
          <h4 className="font-medium text-white mb-2">Confirm Items</h4>
          <div className="space-y-3">
            {grn.items.map((item, index) => (
              <div key={item.id} className="bg-dark-800 rounded-lg p-3">
                <p className="text-white font-medium mb-2">{item.materialName}</p>
                <p className="text-sm text-dark-400 mb-2">Expected: {item.expectedPackets} packets</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-dark-400">Received</label>
                    <input
                      type="number"
                      min="0"
                      max={item.expectedPackets}
                      className="form-input mt-1"
                      value={items[index].receivedPackets}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].receivedPackets = parseInt(e.target.value) || 0;
                        setItems(newItems);
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-400">Damaged</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input mt-1"
                      value={items[index].damagedPackets}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].damagedPackets = parseInt(e.target.value) || 0;
                        setItems(newItems);
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="form-label">Notes (optional)</label>
          <textarea
            className="form-input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this receipt..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">
            {isLoading ? 'Confirming...' : 'Confirm Receipt'}
          </button>
        </div>
      </form>
    </Modal>
  );
}