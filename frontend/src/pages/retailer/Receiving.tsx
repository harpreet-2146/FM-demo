import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatusBadge, StatCard } from '../../components/Layout';
import { grnApi, invoiceApi } from '../../services/api';
import type { GRN, ConfirmGRNDto } from '../../types';
import { Truck, CheckCircle, Clock, FileText, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function RetailerReceiving() {
  const queryClient = useQueryClient();
  const [selectedGRN, setSelectedGRN] = useState<GRN | null>(null);
  const [confirmingGRN, setConfirmingGRN] = useState<GRN | null>(null);

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
      setConfirmingGRN(null);
      toast.success('GRN confirmed - inventory updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to confirm GRN');
    },
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: (grnId: string) => invoiceApi.generate(grnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-grns'] });
      toast.success('Invoice generated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate invoice');
    },
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const grnList = grns?.data || [];
  const pendingCount = grnList.filter(g => g.status === 'PENDING').length;
  const confirmedCount = grnList.filter(g => g.status === 'CONFIRMED').length;

  return (
    <Layout>
      <PageHeader
        title="Receiving (GRN)"
        subtitle="Confirm goods received and manage deliveries"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total GRNs"
          value={grnList.length}
          icon={Truck}
        />
        <StatCard
          title="Pending"
          value={pendingCount}
          subtitle="Awaiting confirmation"
          icon={Clock}
        />
        <StatCard
          title="Confirmed"
          value={confirmedCount}
          icon={CheckCircle}
        />
      </div>

      {/* GRN List */}
      {grnList.length === 0 ? (
        <Card>
          <EmptyState
            icon={Truck}
            title="No Deliveries"
            description="You'll see goods receipt notes here when dispatches are delivered to you."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th>GRN #</th>
                  <th>Dispatch #</th>
                  <th>Manufacturer</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Invoice</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {grnList.map((grn) => (
                  <tr key={grn.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{grn.grnNumber}</td>
                    <td>{grn.dispatchNumber}</td>
                    <td>{grn.manufacturerName || '-'}</td>
                    <td>{grn.items.length}</td>
                    <td><StatusBadge status={grn.status} /></td>
                    <td>
                      {grn.hasInvoice ? (
                        <span className="text-green-400 text-sm">Generated</span>
                      ) : grn.status === 'CONFIRMED' ? (
                        <button
                          onClick={() => generateInvoiceMutation.mutate(grn.id)}
                          disabled={generateInvoiceMutation.isPending}
                          className="text-primary-400 hover:text-primary-300 text-sm"
                        >
                          Generate
                        </button>
                      ) : (
                        <span className="text-dark-500 text-sm">-</span>
                      )}
                    </td>
                    <td>{new Date(grn.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedGRN(grn)}
                          className="text-primary-400 hover:text-primary-300 text-sm"
                        >
                          View
                        </button>
                        {grn.status === 'PENDING' && (
                          <button
                            onClick={() => setConfirmingGRN(grn)}
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            Confirm
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

      {/* Info Card */}
      <div className="mt-6">
        <Card>
          <h3 className="text-lg font-semibold text-white mb-3">GRN Workflow</h3>
          <div className="space-y-2 text-sm text-dark-300">
            <p>1. <strong>Receive delivery</strong> - GRN is auto-created when dispatch arrives</p>
            <p>2. <strong>Verify quantities</strong> - Check packets and loose units received</p>
            <p>3. <strong>Confirm GRN</strong> - Updates your inventory with received quantities</p>
            <p>4. <strong>Report issues</strong> - Use the <Link to="/retailer/returns" className="text-primary-400 hover:underline">Returns</Link> feature for damaged/missing goods</p>
          </div>
        </Card>
      </div>

      {/* View GRN Modal */}
      {selectedGRN && (
        <ViewGRNModal
          grn={selectedGRN}
          onClose={() => setSelectedGRN(null)}
        />
      )}

      {/* Confirm GRN Modal */}
      {confirmingGRN && (
        <ConfirmGRNModal
          grn={confirmingGRN}
          onClose={() => setConfirmingGRN(null)}
          onConfirm={(data) => confirmMutation.mutate({ id: confirmingGRN.id, data })}
          isLoading={confirmMutation.isPending}
        />
      )}
    </Layout>
  );
}

function ViewGRNModal({ grn, onClose }: { grn: GRN; onClose: () => void }) {
  return (
    <Modal isOpen={true} onClose={onClose} title={`GRN: ${grn.grnNumber}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-dark-400">Status:</span>
            <span className="ml-2"><StatusBadge status={grn.status} /></span>
          </div>
          <div>
            <span className="text-dark-400">Dispatch:</span>
            <span className="ml-2 text-white">{grn.dispatchNumber}</span>
          </div>
          <div>
            <span className="text-dark-400">Manufacturer:</span>
            <span className="ml-2 text-white">{grn.manufacturerName || '-'}</span>
          </div>
          <div>
            <span className="text-dark-400">Created:</span>
            <span className="ml-2 text-white">{new Date(grn.createdAt).toLocaleString()}</span>
          </div>
          {grn.confirmedAt && (
            <div className="col-span-2">
              <span className="text-dark-400">Confirmed:</span>
              <span className="ml-2 text-white">{new Date(grn.confirmedAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        <div>
          <h4 className="font-medium text-white mb-2">Items</h4>
          <table className="w-full text-sm">
            <thead className="bg-dark-800">
              <tr>
                <th className="text-left p-2">Material</th>
                <th className="text-right p-2">Expected Pkt</th>
                <th className="text-right p-2">Expected Loose</th>
                {grn.status === 'CONFIRMED' && (
                  <>
                    <th className="text-right p-2">Received Pkt</th>
                    <th className="text-right p-2">Received Loose</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {grn.items.map((item) => (
                <tr key={item.id}>
                  <td className="p-2">{item.materialName}</td>
                  <td className="text-right p-2">{item.expectedPackets}</td>
                  <td className="text-right p-2">{item.expectedLooseUnits || 0}</td>
                  {grn.status === 'CONFIRMED' && (
                    <>
                      <td className="text-right p-2 text-green-400">{item.receivedPackets ?? '-'}</td>
                      <td className="text-right p-2 text-green-400">{item.receivedLooseUnits ?? '-'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {grn.notes && (
          <div className="text-sm">
            <span className="text-dark-400">Notes:</span>
            <p className="text-white mt-1">{grn.notes}</p>
          </div>
        )}

        <button onClick={onClose} className="btn btn-secondary w-full">
          Close
        </button>
      </div>
    </Modal>
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
    grn.items.map(item => ({
      materialId: item.materialId,
      materialName: item.materialName,
      expectedPackets: item.expectedPackets,
      expectedLooseUnits: item.expectedLooseUnits || 0,
      receivedPackets: item.expectedPackets,
      receivedLooseUnits: item.expectedLooseUnits || 0,
    }))
  );
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onConfirm({
      items: items.map(item => ({
        materialId: item.materialId,
        receivedPackets: item.receivedPackets,
        receivedLooseUnits: item.receivedLooseUnits,  // Send 0 if 0, not undefined
      })),
      notes: notes || undefined,
    });
  };

  const hasDiscrepancy = items.some(
    item => 
      item.receivedPackets !== item.expectedPackets ||
      item.receivedLooseUnits !== item.expectedLooseUnits
  );

  return (
    <Modal isOpen={true} onClose={onClose} title={`Confirm GRN: ${grn.grnNumber}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-dark-300">
          Verify the quantities received. If anything is missing or damaged, 
          adjust the received quantities and create a <strong>Return</strong> after confirmation.
        </p>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.materialId} className="bg-dark-800 rounded-lg p-3">
              <div className="flex justify-between mb-2">
                <span className="font-medium text-white">{item.materialName}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-dark-400 text-xs">Expected</label>
                  <p className="text-white">
                    {item.expectedPackets} pkt + {item.expectedLooseUnits} loose
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-dark-400 text-xs">Received Pkt</label>
                    <input
                      type="number"
                      min="0"
                      max={item.expectedPackets}
                      className="form-input text-sm"
                      value={item.receivedPackets}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].receivedPackets = parseInt(e.target.value) || 0;
                        setItems(newItems);
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-dark-400 text-xs">Received Loose</label>
                    <input
                      type="number"
                      min="0"
                      max={item.expectedLooseUnits}
                      className="form-input text-sm"
                      value={item.receivedLooseUnits}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].receivedLooseUnits = parseInt(e.target.value) || 0;
                        setItems(newItems);
                      }}
                    />
                  </div>
                </div>
              </div>
              {(item.receivedPackets < item.expectedPackets || item.receivedLooseUnits < item.expectedLooseUnits) && (
                <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Discrepancy detected - remember to file a Return
                </div>
              )}
            </div>
          ))}
        </div>

        <div>
          <label className="form-label">Notes</label>
          <textarea
            className="form-input"
            rows={2}
            placeholder="Any notes about the delivery..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {hasDiscrepancy && (
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-400">
              <strong>Discrepancy detected!</strong> After confirming, go to <strong>Returns</strong> to report 
              damaged or missing goods.
            </p>
          </div>
        )}

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