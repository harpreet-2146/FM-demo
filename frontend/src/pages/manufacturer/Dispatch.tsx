import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatusBadge } from '../../components/Layout';
import { dispatchApi } from '../../services/api';
import type { DispatchOrder } from '../../types';
import { Truck, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManufacturerDispatch() {
  const queryClient = useQueryClient();
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchOrder | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const { data: dispatches, isLoading } = useQuery({
    queryKey: ['my-dispatches'],
    queryFn: () => dispatchApi.getMy(),
  });

  const executeMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      dispatchApi.execute(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturer-inventory'] });
      setSelectedDispatch(null);
      setDeliveryNotes('');
      toast.success('Dispatch executed - goods are now in transit');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to execute dispatch');
    },
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const dispatchList = dispatches?.data || [];
  const pendingDispatches = dispatchList.filter(d => d.status === 'PENDING');
  const inTransitDispatches = dispatchList.filter(d => d.status === 'IN_TRANSIT');
  const deliveredDispatches = dispatchList.filter(d => d.status === 'DELIVERED');

  return (
    <Layout>
      <PageHeader
        title="Dispatch Orders"
        subtitle="Execute dispatches assigned to you - No pricing data visible"
      />

      {pendingDispatches.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="badge badge-warning">Action Required</span>
            Pending Dispatches
          </h3>
          <div className="grid gap-4">
            {pendingDispatches.map((dispatch) => (
              <Card key={dispatch.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white">{dispatch.dispatchNumber}</h4>
                    <p className="text-sm text-dark-400">
                      SRN: {dispatch.srnNumber} • Retailer: {dispatch.retailerName}
                    </p>
                    <p className="text-sm text-dark-400 mt-1">
                      Total: {dispatch.totalPackets} packets
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDispatch(dispatch)}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Send size={16} />
                    Execute
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-dark-700">
                  <p className="text-xs text-dark-400 mb-2">Items:</p>
                  <div className="flex flex-wrap gap-2">
                    {dispatch.items.map((item) => (
                      <span key={item.id} className="badge badge-gray">
                        {item.materialName}: {item.packets} pkt
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {(inTransitDispatches.length > 0 || deliveredDispatches.length > 0) && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th>Dispatch #</th>
                  <th>Retailer</th>
                  <th>Packets</th>
                  <th>Executed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {[...inTransitDispatches, ...deliveredDispatches].map((dispatch) => (
                  <tr key={dispatch.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{dispatch.dispatchNumber}</td>
                    <td>{dispatch.retailerName}</td>
                    <td>{dispatch.totalPackets}</td>
                    <td>{dispatch.executedAt ? new Date(dispatch.executedAt).toLocaleString() : '-'}</td>
                    <td><StatusBadge status={dispatch.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {dispatchList.length === 0 && (
        <Card>
          <EmptyState
            icon={Truck}
            title="No Dispatch Orders"
            description="You will see dispatch orders here when Admin assigns them to you."
          />
        </Card>
      )}

      {selectedDispatch && (
        <Modal
          isOpen={true}
          onClose={() => { setSelectedDispatch(null); setDeliveryNotes(''); }}
          title={`Execute ${selectedDispatch.dispatchNumber}`}
        >
          <div className="space-y-4">
            <div className="bg-dark-800 rounded-lg p-4">
              <p className="text-sm">
                <span className="text-dark-400">Retailer:</span>
                <span className="ml-2 text-white">{selectedDispatch.retailerName}</span>
              </p>
              <p className="text-sm mt-1">
                <span className="text-dark-400">Total Packets:</span>
                <span className="ml-2 text-white">{selectedDispatch.totalPackets}</span>
              </p>
            </div>

            <div>
              <h4 className="font-medium text-white mb-2">Items to Dispatch</h4>
              <div className="space-y-2">
                {selectedDispatch.items.map((item) => (
                  <div key={item.id} className="flex justify-between bg-dark-800 rounded p-2 text-sm">
                    <span className="text-white">{item.materialName}</span>
                    <span className="text-primary-500">{item.packets} packets</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">Delivery Notes (optional)</label>
              <textarea
                className="form-input"
                rows={2}
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Any notes about this dispatch..."
              />
            </div>

            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-400">
                <strong>Note:</strong> This will remove {selectedDispatch.totalPackets} blocked packets from your inventory.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => { setSelectedDispatch(null); setDeliveryNotes(''); }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => executeMutation.mutate({ id: selectedDispatch.id, notes: deliveryNotes })}
                disabled={executeMutation.isPending}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Send size={16} />
                {executeMutation.isPending ? 'Executing...' : 'Execute Dispatch'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}