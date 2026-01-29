import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatusBadge, StatCard } from '../../components/Layout';
import { dispatchApi, srnApi } from '../../services/api';
import type { DispatchOrder, SRN } from '../../types';
import { Truck, Package, Send, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManufacturerDispatch() {
  const queryClient = useQueryClient();
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchOrder | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: dispatches, isLoading } = useQuery({
    queryKey: ['my-dispatches'],
    queryFn: () => dispatchApi.getMy(),
  });

  // Get approved SRNs assigned to THIS manufacturer (for creating dispatch)
  const { data: approvedSRNs } = useQuery({
    queryKey: ['my-approved-srns-for-dispatch'],
    queryFn: () => srnApi.getAssigned('APPROVED'),  // Use /srn/assigned endpoint
  });

  const { data: partialSRNs } = useQuery({
    queryKey: ['my-partial-srns-for-dispatch'],
    queryFn: () => srnApi.getAssigned('PARTIAL'),  // Use /srn/assigned endpoint
  });

  // Create dispatch mutation - NOW MANUFACTURER CREATES
  const createMutation = useMutation({
    mutationFn: (srnId: string) => dispatchApi.create(srnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['my-approved-srns-for-dispatch'] });
      queryClient.invalidateQueries({ queryKey: ['my-partial-srns-for-dispatch'] });
      setIsCreateModalOpen(false);
      toast.success('Dispatch order created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create dispatch');
    },
  });

  const executeMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => 
      dispatchApi.execute(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturer-inventory'] });
      setSelectedDispatch(null);
      toast.success('Dispatch executed - goods are now in transit');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to execute dispatch');
    },
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const dispatchList = dispatches?.data || [];
  const pendingSRNs = [...(approvedSRNs?.data || []), ...(partialSRNs?.data || [])];

  const pendingCount = dispatchList.filter(d => d.status === 'PENDING').length;
  const inTransitCount = dispatchList.filter(d => d.status === 'IN_TRANSIT').length;
  const deliveredCount = dispatchList.filter(d => d.status === 'DELIVERED').length;

  return (
    <Layout>
      <PageHeader
        title="Dispatch Orders"
        subtitle="Create and execute dispatches for approved stock requests"
        action={
          pendingSRNs.length > 0 && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Package size={20} />
              Create Dispatch
            </button>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Dispatches"
          value={dispatchList.length}
          icon={Truck}
        />
        <StatCard
          title="Pending"
          value={pendingCount}
          subtitle="Ready to execute"
          icon={Clock}
        />
        <StatCard
          title="In Transit"
          value={inTransitCount}
          subtitle="On the way"
          icon={Send}
        />
        <StatCard
          title="Delivered"
          value={deliveredCount}
          icon={CheckCircle}
        />
      </div>

      {/* Pending SRNs Notification */}
      {pendingSRNs.length > 0 && (
        <div className="bg-primary-900/20 border border-primary-700 rounded-lg p-4 mb-6">
          <p className="text-primary-400">
            <strong>{pendingSRNs.length} approved SRN(s)</strong> waiting for dispatch creation.
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="ml-2 underline hover:no-underline"
            >
              Create dispatch now
            </button>
          </p>
        </div>
      )}

      {/* Dispatch List */}
      {dispatchList.length === 0 ? (
        <Card>
          <EmptyState
            icon={Truck}
            title="No Dispatches"
            description={pendingSRNs.length > 0 
              ? "Create a dispatch for approved stock requests to start shipping."
              : "No approved SRNs available for dispatch yet."
            }
            action={pendingSRNs.length > 0 ? (
              <button 
                onClick={() => setIsCreateModalOpen(true)} 
                className="btn btn-primary"
              >
                Create First Dispatch
              </button>
            ) : null}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th>Dispatch #</th>
                  <th>SRN #</th>
                  <th>Retailer</th>
                  <th>Items</th>
                  <th>Packets</th>
                  <th>Loose Units</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {dispatchList.map((dispatch) => (
                  <tr key={dispatch.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{dispatch.dispatchNumber}</td>
                    <td>{dispatch.srnNumber}</td>
                    <td>{dispatch.retailerName}</td>
                    <td>{dispatch.items.length}</td>
                    <td>{dispatch.totalPackets}</td>
                    <td>{dispatch.totalLooseUnits || 0}</td>
                    <td><StatusBadge status={dispatch.status} /></td>
                    <td>{new Date(dispatch.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedDispatch(dispatch)}
                          className="text-primary-400 hover:text-primary-300 text-sm"
                        >
                          View
                        </button>
                        {dispatch.status === 'PENDING' && (
                          <button
                            onClick={() => executeMutation.mutate({ id: dispatch.id })}
                            disabled={executeMutation.isPending}
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            Execute
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Dispatch Modal */}
      <CreateDispatchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        pendingSRNs={pendingSRNs}
        onCreate={(srnId) => createMutation.mutate(srnId)}
        isLoading={createMutation.isPending}
      />

      {/* View/Execute Dispatch Modal */}
      {selectedDispatch && (
        <DispatchDetailModal
          dispatch={selectedDispatch}
          onClose={() => setSelectedDispatch(null)}
          onExecute={(notes) => executeMutation.mutate({ id: selectedDispatch.id, notes })}
          isExecuting={executeMutation.isPending}
        />
      )}
    </Layout>
  );
}

function CreateDispatchModal({
  isOpen,
  onClose,
  pendingSRNs,
  onCreate,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  pendingSRNs: SRN[];
  onCreate: (srnId: string) => void;
  isLoading: boolean;
}) {
  const [selectedSRN, setSelectedSRN] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSRN) {
      toast.error('Select an SRN');
      return;
    }
    onCreate(selectedSRN);
  };

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedSRN('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selected = pendingSRNs.find(s => s.id === selectedSRN);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Dispatch Order">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Select Approved SRN *</label>
          <select
            className="form-input"
            value={selectedSRN}
            onChange={(e) => setSelectedSRN(e.target.value)}
            required
          >
            <option value="">Select SRN...</option>
            {pendingSRNs.map((srn) => (
              <option key={srn.id} value={srn.id}>
                {srn.srnNumber} - {srn.retailerName} ({srn.items.length} items)
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <div className="bg-dark-800 rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Retailer:</span>
              <span className="text-white">{selected.retailerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Status:</span>
              <StatusBadge status={selected.status} />
            </div>
            <div className="border-t border-dark-700 pt-3">
              <p className="text-sm text-dark-400 mb-2">Items to dispatch:</p>
              {selected.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.materialName}</span>
                  <span className="text-white">
                    {item.approvedPackets || item.requestedPackets} pkt
                    {(item.approvedLooseUnits || item.requestedLooseUnits) > 0 && (
                      <span className="text-dark-400 ml-1">
                        + {item.approvedLooseUnits || item.requestedLooseUnits} loose
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-400">
            <strong>Note:</strong> Creating a dispatch will use the approved quantities from the SRN. 
            Inventory will be deducted when you execute the dispatch.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={isLoading || !selectedSRN} className="btn btn-primary flex-1">
            {isLoading ? 'Creating...' : 'Create Dispatch'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DispatchDetailModal({
  dispatch,
  onClose,
  onExecute,
  isExecuting,
}: {
  dispatch: DispatchOrder;
  onClose: () => void;
  onExecute: (notes?: string) => void;
  isExecuting: boolean;
}) {
  const [deliveryNotes, setDeliveryNotes] = useState('');

  return (
    <Modal isOpen={true} onClose={onClose} title={`Dispatch: ${dispatch.dispatchNumber}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-dark-400">Status:</span>
            <span className="ml-2"><StatusBadge status={dispatch.status} /></span>
          </div>
          <div>
            <span className="text-dark-400">SRN:</span>
            <span className="ml-2 text-white">{dispatch.srnNumber}</span>
          </div>
          <div>
            <span className="text-dark-400">Retailer:</span>
            <span className="ml-2 text-white">{dispatch.retailerName}</span>
          </div>
          <div>
            <span className="text-dark-400">Created:</span>
            <span className="ml-2 text-white">{new Date(dispatch.createdAt).toLocaleString()}</span>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-white mb-2">Items</h4>
          <table className="w-full text-sm">
            <thead className="bg-dark-800">
              <tr>
                <th className="text-left p-2">Material</th>
                <th className="text-right p-2">Packets</th>
                <th className="text-right p-2">Loose Units</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {dispatch.items.map((item) => (
                <tr key={item.id}>
                  <td className="p-2">{item.materialName}</td>
                  <td className="text-right p-2">{item.packets}</td>
                  <td className="text-right p-2">{item.looseUnits || 0}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-dark-800">
              <tr>
                <td className="p-2 font-medium">Total</td>
                <td className="text-right p-2 font-medium">{dispatch.totalPackets}</td>
                <td className="text-right p-2 font-medium">{dispatch.totalLooseUnits || 0}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {dispatch.status === 'PENDING' && (
          <div className="space-y-3 border-t border-dark-700 pt-4">
            <div>
              <label className="form-label">Delivery Notes (optional)</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Add any delivery instructions..."
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
              />
            </div>
            
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-400">
                <strong>Warning:</strong> Executing this dispatch will deduct inventory and mark goods as in-transit.
              </p>
            </div>

            <button
              onClick={() => onExecute(deliveryNotes || undefined)}
              disabled={isExecuting}
              className="btn btn-primary w-full"
            >
              {isExecuting ? 'Executing...' : 'Execute Dispatch'}
            </button>
          </div>
        )}

        {dispatch.status !== 'PENDING' && dispatch.executedAt && (
          <div className="text-sm text-dark-400">
            Executed: {new Date(dispatch.executedAt).toLocaleString()}
            {dispatch.deliveryNotes && (
              <p className="mt-2">Notes: {dispatch.deliveryNotes}</p>
            )}
          </div>
        )}

        <button onClick={onClose} className="btn btn-secondary w-full">
          Close
        </button>
      </div>
    </Modal>
  );
}