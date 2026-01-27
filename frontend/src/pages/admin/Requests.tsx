import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatusBadge } from '../../components/Layout';
import { srnApi, dispatchApi, usersApi } from '../../services/api';
import type { SRN, ApproveSRNDto } from '../../types';
import { ClipboardList, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminRequests() {
  const queryClient = useQueryClient();
  const [selectedSRN, setSelectedSRN] = useState<SRN | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);

  const { data: srns, isLoading } = useQuery({
    queryKey: ['all-srns'],
    queryFn: () => srnApi.getAll(),
  });

  const { data: manufacturers } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => usersApi.getManufacturers(),
  });

  const processMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveSRNDto }) =>
      srnApi.process(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-srns'] });
      queryClient.invalidateQueries({ queryKey: ['srn-pending-count'] });
      setSelectedSRN(null);
      setShowApproveModal(false);
      toast.success('SRN processed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process SRN');
    },
  });

  const createDispatchMutation = useMutation({
    mutationFn: dispatchApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-srns'] });
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      toast.success('Dispatch order created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create dispatch');
    },
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const srnList = srns?.data || [];
  const manufacturerList = manufacturers?.data || [];

  const pendingSRNs = srnList.filter(s => s.status === 'SUBMITTED');
  const approvedSRNs = srnList.filter(s => s.status === 'APPROVED' || s.status === 'PARTIAL');
  const otherSRNs = srnList.filter(s => s.status === 'DRAFT' || s.status === 'REJECTED');

  return (
    <Layout>
      <PageHeader
        title="Stock Requests (SRNs)"
        subtitle="Review and process retailer stock requisition notes"
      />

      {/* Pending Approval Section */}
      {pendingSRNs.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="badge badge-warning">Action Required</span>
            Pending Approval ({pendingSRNs.length})
          </h3>
          <div className="grid gap-4">
            {pendingSRNs.map((srn) => (
              <Card key={srn.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white">{srn.srnNumber}</h4>
                    <p className="text-sm text-dark-400">
                      Retailer: {srn.retailerName} • Submitted: {new Date(srn.submittedAt || srn.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSelectedSRN(srn); setShowApproveModal(true); }}
                      className="btn btn-primary flex items-center gap-1"
                    >
                      <CheckCircle size={16} />
                      Process
                    </button>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-dark-700">
                  <p className="text-xs text-dark-400 mb-2">Requested Items:</p>
                  <div className="flex flex-wrap gap-2">
                    {srn.items.map((item) => (
                      <span key={item.id} className="badge badge-gray">
                        {item.materialName}: {item.requestedPackets} pkt
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Approved - Ready for Dispatch */}
      {approvedSRNs.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">
            Approved - Ready for Dispatch
          </h3>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-800">
                  <tr>
                    <th>SRN #</th>
                    <th>Retailer</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Approved</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {approvedSRNs.map((srn) => (
                    <tr key={srn.id} className="hover:bg-dark-800/50">
                      <td className="font-medium text-white">{srn.srnNumber}</td>
                      <td>{srn.retailerName}</td>
                      <td>{srn.items.length} item(s)</td>
                      <td><StatusBadge status={srn.status} /></td>
                      <td>{srn.approvedAt ? new Date(srn.approvedAt).toLocaleDateString() : '-'}</td>
                      <td>
                        <button
                          onClick={() => createDispatchMutation.mutate(srn.id)}
                          className="btn btn-success btn-sm"
                          disabled={createDispatchMutation.isPending}
                        >
                          Create Dispatch
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* All SRNs Table */}
      {srnList.length > 0 ? (
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">All Requests</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th>SRN #</th>
                  <th>Retailer</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {srnList.map((srn) => (
                  <tr key={srn.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{srn.srnNumber}</td>
                    <td>{srn.retailerName}</td>
                    <td>{srn.items.length} item(s)</td>
                    <td><StatusBadge status={srn.status} /></td>
                    <td>{new Date(srn.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => setSelectedSRN(srn)}
                        className="btn btn-secondary btn-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No Stock Requests"
            description="Retailers will create SRNs to request stock."
          />
        </Card>
      )}

      {/* View SRN Modal */}
      {selectedSRN && !showApproveModal && (
        <Modal isOpen={true} onClose={() => setSelectedSRN(null)} title={`SRN ${selectedSRN.srnNumber}`}>
          <div className="space-y-4">
            <div className="bg-dark-800 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-dark-400">Retailer:</span>
                  <span className="ml-2 text-white">{selectedSRN.retailerName}</span>
                </div>
                <div>
                  <span className="text-dark-400">Status:</span>
                  <span className="ml-2"><StatusBadge status={selectedSRN.status} /></span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-white mb-2">Items</h4>
              <div className="space-y-2">
                {selectedSRN.items.map((item) => (
                  <div key={item.id} className="bg-dark-800 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white">{item.materialName}</p>
                      <p className="text-sm text-dark-400">Requested: {item.requestedPackets} packets</p>
                    </div>
                    {item.approvedPackets !== undefined && (
                      <span className="text-primary-500">Approved: {item.approvedPackets}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {selectedSRN.rejectionNote && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-400">
                  <strong>Rejection Note:</strong> {selectedSRN.rejectionNote}
                </p>
              </div>
            )}

            <button onClick={() => setSelectedSRN(null)} className="btn btn-secondary w-full">
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Approve/Reject Modal */}
      {selectedSRN && showApproveModal && (
        <ApprovalModal
          srn={selectedSRN}
          manufacturers={manufacturerList}
          onClose={() => { setSelectedSRN(null); setShowApproveModal(false); }}
          onProcess={(data) => processMutation.mutate({ id: selectedSRN.id, data })}
          isLoading={processMutation.isPending}
        />
      )}
    </Layout>
  );
}

function ApprovalModal({
  srn,
  manufacturers,
  onClose,
  onProcess,
  isLoading,
}: {
  srn: SRN;
  manufacturers: { id: string; name: string }[];
  onClose: () => void;
  onProcess: (data: ApproveSRNDto) => void;
  isLoading: boolean;
}) {
  const [action, setAction] = useState<'APPROVED' | 'PARTIAL' | 'REJECTED'>('APPROVED');
  const [manufacturerId, setManufacturerId] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [items, setItems] = useState(
    srn.items.map((item) => ({
      materialId: item.materialId,
      approvedPackets: item.requestedPackets,
    }))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (action === 'REJECTED') {
      if (!rejectionNote.trim()) {
        toast.error('Rejection note is required');
        return;
      }
      onProcess({ action, manufacturerId: manufacturerId || 'N/A', rejectionNote });
      return;
    }

    if (!manufacturerId) {
      toast.error('Select a manufacturer');
      return;
    }

    // Determine action based on approved quantities
    let finalAction = action;
    const allFull = items.every((item, i) => item.approvedPackets === srn.items[i].requestedPackets);
    const anyApproved = items.some((item) => item.approvedPackets > 0);

    if (!anyApproved) {
      toast.error('Approve at least one item or reject the SRN');
      return;
    }

    if (!allFull) {
      finalAction = 'PARTIAL';
    }

    onProcess({
      action: finalAction,
      manufacturerId,
      items,
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Process SRN ${srn.srnNumber}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-dark-800 rounded-lg p-4">
          <p className="text-sm">
            <span className="text-dark-400">Retailer:</span>
            <span className="ml-2 text-white">{srn.retailerName}</span>
          </p>
        </div>

        <div>
          <label className="form-label">Action</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAction('APPROVED')}
              className={`flex-1 p-3 rounded-lg border ${action === 'APPROVED' || action === 'PARTIAL' ? 'border-primary-500 bg-primary-900/20' : 'border-dark-600'}`}
            >
              <CheckCircle size={20} className={action === 'APPROVED' || action === 'PARTIAL' ? 'text-primary-500' : 'text-dark-400'} />
              <span className="block mt-1 text-sm">Approve</span>
            </button>
            <button
              type="button"
              onClick={() => setAction('REJECTED')}
              className={`flex-1 p-3 rounded-lg border ${action === 'REJECTED' ? 'border-red-500 bg-red-900/20' : 'border-dark-600'}`}
            >
              <XCircle size={20} className={action === 'REJECTED' ? 'text-red-500' : 'text-dark-400'} />
              <span className="block mt-1 text-sm">Reject</span>
            </button>
          </div>
        </div>

        {action !== 'REJECTED' && (
          <>
            <div>
              <label className="form-label">Assign Manufacturer *</label>
              <select
                className="form-input"
                value={manufacturerId}
                onChange={(e) => setManufacturerId(e.target.value)}
                required
              >
                <option value="">Select manufacturer...</option>
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Approve Quantities</label>
              <div className="space-y-2">
                {srn.items.map((item, index) => (
                  <div key={item.id} className="bg-dark-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white">{item.materialName}</span>
                      <span className="text-sm text-dark-400">Requested: {item.requestedPackets}</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={item.requestedPackets}
                      className="form-input"
                      value={items[index].approvedPackets}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].approvedPackets = parseInt(e.target.value) || 0;
                        setItems(newItems);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {action === 'REJECTED' && (
          <div>
            <label className="form-label">Rejection Note *</label>
            <textarea
              className="form-input"
              rows={3}
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="Reason for rejection..."
              required
            />
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`flex-1 ${action === 'REJECTED' ? 'btn btn-danger' : 'btn btn-primary'}`}
          >
            {isLoading ? 'Processing...' : action === 'REJECTED' ? 'Reject SRN' : 'Approve SRN'}
          </button>
        </div>
      </form>
    </Modal>
  );
}