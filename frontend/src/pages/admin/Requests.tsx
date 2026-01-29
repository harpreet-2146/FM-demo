import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatusBadge, StatCard } from '../../components/Layout';
import { srnApi } from '../../services/api';
import type { SRN, ApproveSRNDto } from '../../types';
import { ClipboardList, CheckCircle, XCircle, Clock, Factory } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminRequests() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'>('SUBMITTED');
  const [selectedSRN, setSelectedSRN] = useState<SRN | null>(null);
  const [processingMode, setProcessingMode] = useState<'view' | 'process'>('view');

  const { data: srns, isLoading } = useQuery({
    queryKey: ['all-srns', filter],
    queryFn: () => srnApi.getAll(filter === 'all' ? undefined : filter),
  });

  const { data: pendingCount } = useQuery({
    queryKey: ['pending-srn-count'],
    queryFn: () => srnApi.getPendingCount(),
  });

  const processMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveSRNDto }) =>
      srnApi.process(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-srns'] });
      queryClient.invalidateQueries({ queryKey: ['pending-srn-count'] });
      setSelectedSRN(null);
      setProcessingMode('view');
      toast.success('SRN processed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process SRN');
    },
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const srnList = srns?.data || [];
  const pending = pendingCount?.data?.count || 0;

  return (
    <Layout>
      <PageHeader
        title="Stock Requests"
        subtitle="Review and process retailer stock requisition notes"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Requests"
          value={srnList.length}
          icon={ClipboardList}
        />
        <StatCard
          title="Pending Review"
          value={pending}
          subtitle="Needs your attention"
          icon={Clock}
        />
        <StatCard
          title="Approved"
          value={srnList.filter(s => ['APPROVED', 'PARTIAL'].includes(s.status)).length}
          icon={CheckCircle}
        />
        <StatCard
          title="Rejected"
          value={srnList.filter(s => s.status === 'REJECTED').length}
          icon={XCircle}
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['SUBMITTED', 'all', 'APPROVED', 'REJECTED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-dark-800 text-dark-300 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* SRN List */}
      {srnList.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No Requests"
            description={filter === 'SUBMITTED' 
              ? "No pending requests to review." 
              : "No requests found for this filter."
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th>SRN #</th>
                  <th>Retailer</th>
                  <th>Manufacturer</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {srnList.map((srn) => (
                  <tr key={srn.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{srn.srnNumber}</td>
                    <td>{srn.retailerName}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Factory size={16} className="text-primary-400" />
                        {srn.manufacturerName}
                      </div>
                    </td>
                    <td>{srn.items.length}</td>
                    <td><StatusBadge status={srn.status} /></td>
                    <td>{srn.submittedAt ? new Date(srn.submittedAt).toLocaleDateString() : '-'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedSRN(srn);
                            setProcessingMode('view');
                          }}
                          className="text-primary-400 hover:text-primary-300 text-sm"
                        >
                          View
                        </button>
                        {srn.status === 'SUBMITTED' && (
                          <button
                            onClick={() => {
                              setSelectedSRN(srn);
                              setProcessingMode('process');
                            }}
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            Process
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

      {/* View/Process SRN Modal */}
      {selectedSRN && processingMode === 'view' && (
        <ViewSRNModal
          srn={selectedSRN}
          onClose={() => setSelectedSRN(null)}
          onProcess={() => setProcessingMode('process')}
        />
      )}

      {selectedSRN && processingMode === 'process' && (
        <ProcessSRNModal
          srn={selectedSRN}
          onClose={() => {
            setSelectedSRN(null);
            setProcessingMode('view');
          }}
          onProcess={(data) => processMutation.mutate({ id: selectedSRN.id, data })}
          isLoading={processMutation.isPending}
        />
      )}
    </Layout>
  );
}

function ViewSRNModal({ 
  srn, 
  onClose, 
  onProcess 
}: { 
  srn: SRN; 
  onClose: () => void;
  onProcess: () => void;
}) {
  return (
    <Modal isOpen={true} onClose={onClose} title={`SRN: ${srn.srnNumber}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-dark-400">Status:</span>
            <span className="ml-2"><StatusBadge status={srn.status} /></span>
          </div>
          <div>
            <span className="text-dark-400">Retailer:</span>
            <span className="ml-2 text-white">{srn.retailerName}</span>
          </div>
          <div>
            <span className="text-dark-400">Manufacturer:</span>
            <span className="ml-2 text-white">{srn.manufacturerName}</span>
          </div>
          <div>
            <span className="text-dark-400">Submitted:</span>
            <span className="ml-2 text-white">
              {srn.submittedAt ? new Date(srn.submittedAt).toLocaleString() : '-'}
            </span>
          </div>
          {srn.approvedAt && (
            <div>
              <span className="text-dark-400">Processed:</span>
              <span className="ml-2 text-white">{new Date(srn.approvedAt).toLocaleString()}</span>
            </div>
          )}
          {srn.approverName && (
            <div>
              <span className="text-dark-400">Processed By:</span>
              <span className="ml-2 text-white">{srn.approverName}</span>
            </div>
          )}
        </div>

        {srn.rejectionNote && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-400"><strong>Rejection Note:</strong> {srn.rejectionNote}</p>
          </div>
        )}

        <div>
          <h4 className="font-medium text-white mb-2">Items</h4>
          <table className="w-full text-sm">
            <thead className="bg-dark-800">
              <tr>
                <th className="text-left p-2">Material</th>
                <th className="text-right p-2">Requested Pkt</th>
                <th className="text-right p-2">Requested Loose</th>
                {['APPROVED', 'PARTIAL'].includes(srn.status) && (
                  <>
                    <th className="text-right p-2">Approved Pkt</th>
                    <th className="text-right p-2">Approved Loose</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {srn.items.map((item) => (
                <tr key={item.id}>
                  <td className="p-2">{item.materialName}</td>
                  <td className="text-right p-2">{item.requestedPackets}</td>
                  <td className="text-right p-2">{item.requestedLooseUnits || 0}</td>
                  {['APPROVED', 'PARTIAL'].includes(srn.status) && (
                    <>
                      <td className="text-right p-2 text-green-400">{item.approvedPackets ?? '-'}</td>
                      <td className="text-right p-2 text-green-400">{item.approvedLooseUnits ?? '-'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Close
          </button>
          {srn.status === 'SUBMITTED' && (
            <button onClick={onProcess} className="btn btn-primary flex-1">
              Process
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ProcessSRNModal({
  srn,
  onClose,
  onProcess,
  isLoading,
}: {
  srn: SRN;
  onClose: () => void;
  onProcess: (data: ApproveSRNDto) => void;
  isLoading: boolean;
}) {
  const [action, setAction] = useState<'APPROVED' | 'PARTIAL' | 'REJECTED'>('APPROVED');
  const [items, setItems] = useState(
    srn.items.map(item => ({
      materialId: item.materialId,
      materialName: item.materialName,
      requestedPackets: item.requestedPackets,
      requestedLooseUnits: item.requestedLooseUnits || 0,
      approvedPackets: item.requestedPackets,
      approvedLooseUnits: item.requestedLooseUnits || 0,
    }))
  );
  const [rejectionNote, setRejectionNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (action === 'REJECTED') {
      if (!rejectionNote.trim()) {
        toast.error('Please provide a rejection reason');
        return;
      }
      onProcess({ action: 'REJECTED', rejectionNote });
    } else {
      const approvedItems = items.map(item => ({
        materialId: item.materialId,
        approvedPackets: item.approvedPackets,
        approvedLooseUnits: item.approvedLooseUnits || undefined,
      }));

      // Check if it's partial (any item has less than requested)
      const isPartial = items.some(
        item => 
          item.approvedPackets < item.requestedPackets ||
          item.approvedLooseUnits < item.requestedLooseUnits
      );

      onProcess({
        action: isPartial ? 'PARTIAL' : 'APPROVED',
        items: approvedItems,
      });
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Process SRN: ${srn.srnNumber}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-dark-800 rounded-lg p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-dark-400">Retailer:</span>
            <span className="text-white">{srn.retailerName}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-dark-400">Manufacturer:</span>
            <span className="text-white">{srn.manufacturerName}</span>
          </div>
        </div>

        {/* Action Selection */}
        <div>
          <label className="form-label">Action</label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={action === 'APPROVED' || action === 'PARTIAL'}
                onChange={() => setAction('APPROVED')}
                className="form-radio"
              />
              <span>Approve</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={action === 'REJECTED'}
                onChange={() => setAction('REJECTED')}
                className="form-radio"
              />
              <span>Reject</span>
            </label>
          </div>
        </div>

        {action !== 'REJECTED' ? (
          <div className="space-y-3">
            <label className="form-label">Approve Quantities</label>
            <p className="text-xs text-dark-400">
              Adjust quantities if needed. Inventory will be blocked from the manufacturer.
            </p>
            {items.map((item, index) => (
              <div key={item.materialId} className="bg-dark-800 rounded-lg p-3">
                <div className="font-medium text-white mb-2">{item.materialName}</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-dark-400 text-xs">Requested</label>
                    <p className="text-white">
                      {item.requestedPackets} pkt + {item.requestedLooseUnits} loose
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-dark-400 text-xs">Approve Pkt</label>
                      <input
                        type="number"
                        min="0"
                        max={item.requestedPackets}
                        className="form-input text-sm"
                        value={item.approvedPackets}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].approvedPackets = parseInt(e.target.value) || 0;
                          setItems(newItems);
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-dark-400 text-xs">Approve Loose</label>
                      <input
                        type="number"
                        min="0"
                        max={item.requestedLooseUnits}
                        className="form-input text-sm"
                        value={item.approvedLooseUnits}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].approvedLooseUnits = parseInt(e.target.value) || 0;
                          setItems(newItems);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <label className="form-label">Rejection Reason *</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Explain why this request is being rejected..."
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
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
            className={`btn flex-1 ${action === 'REJECTED' ? 'bg-red-600 hover:bg-red-700' : 'btn-primary'}`}
          >
            {isLoading ? 'Processing...' : action === 'REJECTED' ? 'Reject' : 'Approve'}
          </button>
        </div>
      </form>
    </Modal>
  );
}