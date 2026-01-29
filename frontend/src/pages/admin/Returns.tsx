import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatusBadge, StatCard } from '../../components/Layout';
import { returnApi } from '../../services/api';
import type { Return, ResolveReturnDto } from '../../types';
import { RotateCcw, Clock, CheckCircle, XCircle, AlertTriangle, Factory, Store } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminReturns() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'RAISED' | 'UNDER_REVIEW' | 'resolved'>('RAISED');
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [processingReturn, setProcessingReturn] = useState<Return | null>(null);

  const { data: returns, isLoading } = useQuery({
    queryKey: ['all-returns', filter],
    queryFn: () => returnApi.getAll(filter === 'all' || filter === 'resolved' ? undefined : filter),
  });

  const { data: pendingCount } = useQuery({
    queryKey: ['pending-return-count'],
    queryFn: () => returnApi.getPendingCount(),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResolveReturnDto }) =>
      returnApi.resolve(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-returns'] });
      queryClient.invalidateQueries({ queryKey: ['pending-return-count'] });
      setProcessingReturn(null);
      toast.success('Return resolved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to resolve return');
    },
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  let returnList = returns?.data || [];
  
  // Filter resolved if needed
  if (filter === 'resolved') {
    returnList = returnList.filter(r => 
      ['APPROVED_RESTOCK', 'APPROVED_REPLACE', 'REJECTED', 'RESOLVED'].includes(r.status)
    );
  }

  const pending = pendingCount?.data?.count || 0;
  const raisedCount = returnList.filter(r => r.status === 'RAISED').length;
  const approvedCount = returnList.filter(r => 
    ['APPROVED_RESTOCK', 'APPROVED_REPLACE'].includes(r.status)
  ).length;

  return (
    <Layout>
      <PageHeader
        title="Returns Management"
        subtitle="Review and resolve retailer return requests"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Returns"
          value={returnList.length}
          icon={RotateCcw}
        />
        <StatCard
          title="Pending Review"
          value={pending}
          subtitle="Needs attention"
          icon={AlertTriangle}
        />
        <StatCard
          title="Approved"
          value={approvedCount}
          icon={CheckCircle}
        />
        <StatCard
          title="New (Raised)"
          value={raisedCount}
          icon={Clock}
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['RAISED', 'UNDER_REVIEW', 'resolved', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-dark-800 text-dark-300 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : f === 'resolved' ? 'Resolved' : f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Returns List */}
      {returnList.length === 0 ? (
        <Card>
          <EmptyState
            icon={RotateCcw}
            title="No Returns"
            description={filter === 'RAISED' 
              ? "No pending returns to review." 
              : "No returns found for this filter."
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th>Return #</th>
                  <th>Retailer</th>
                  <th>Manufacturer</th>
                  <th>Reason</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {returnList.map((ret) => (
                  <tr key={ret.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{ret.returnNumber}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Store size={16} className="text-blue-400" />
                        {ret.retailerName}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Factory size={16} className="text-primary-400" />
                        {ret.manufacturerName}
                      </div>
                    </td>
                    <td className="text-sm">{ret.reason.replace(/_/g, ' ')}</td>
                    <td>{ret.items.length}</td>
                    <td><StatusBadge status={ret.status} /></td>
                    <td>{new Date(ret.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedReturn(ret)}
                          className="text-primary-400 hover:text-primary-300 text-sm"
                        >
                          View
                        </button>
                        {['RAISED', 'UNDER_REVIEW'].includes(ret.status) && (
                          <button
                            onClick={() => setProcessingReturn(ret)}
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            Resolve
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

      {/* View Return Modal */}
      {selectedReturn && !processingReturn && (
        <ViewReturnModal
          ret={selectedReturn}
          onClose={() => setSelectedReturn(null)}
          onResolve={() => {
            setProcessingReturn(selectedReturn);
          }}
        />
      )}

      {/* Resolve Return Modal */}
      {processingReturn && (
        <ResolveReturnModal
          ret={processingReturn}
          onClose={() => setProcessingReturn(null)}
          onResolve={(data) => resolveMutation.mutate({ id: processingReturn.id, data })}
          isLoading={resolveMutation.isPending}
        />
      )}
    </Layout>
  );
}

function ViewReturnModal({ 
  ret, 
  onClose,
  onResolve 
}: { 
  ret: Return; 
  onClose: () => void;
  onResolve: () => void;
}) {
  return (
    <Modal isOpen={true} onClose={onClose} title={`Return: ${ret.returnNumber}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-dark-400">Status:</span>
            <span className="ml-2"><StatusBadge status={ret.status} /></span>
          </div>
          <div>
            <span className="text-dark-400">Reason:</span>
            <span className="ml-2 text-white">{ret.reason.replace(/_/g, ' ')}</span>
          </div>
          <div>
            <span className="text-dark-400">Retailer:</span>
            <span className="ml-2 text-white">{ret.retailerName}</span>
          </div>
          <div>
            <span className="text-dark-400">Manufacturer:</span>
            <span className="ml-2 text-white">{ret.manufacturerName}</span>
          </div>
          <div>
            <span className="text-dark-400">Created:</span>
            <span className="ml-2 text-white">{new Date(ret.createdAt).toLocaleString()}</span>
          </div>
          {ret.grnNumber && (
            <div>
              <span className="text-dark-400">Related GRN:</span>
              <span className="ml-2 text-white">{ret.grnNumber}</span>
            </div>
          )}
        </div>

        {ret.reasonDetails && (
          <div className="bg-dark-800 rounded-lg p-3">
            <p className="text-sm text-dark-400">Details from Retailer:</p>
            <p className="text-white">{ret.reasonDetails}</p>
          </div>
        )}

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
              {ret.items.map((item) => (
                <tr key={item.id}>
                  <td className="p-2">{item.materialName}</td>
                  <td className="text-right p-2">{item.packets}</td>
                  <td className="text-right p-2">{item.looseUnits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {ret.resolutionNotes && (
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-3">
            <p className="text-sm text-dark-400">Resolution Notes:</p>
            <p className="text-white">{ret.resolutionNotes}</p>
            {ret.resolvedAt && (
              <p className="text-xs text-dark-500 mt-2">
                Resolved: {new Date(ret.resolvedAt).toLocaleString()} by {ret.resolverName}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Close
          </button>
          {['RAISED', 'UNDER_REVIEW'].includes(ret.status) && (
            <button onClick={onResolve} className="btn btn-primary flex-1">
              Resolve
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ResolveReturnModal({
  ret,
  onClose,
  onResolve,
  isLoading,
}: {
  ret: Return;
  onClose: () => void;
  onResolve: (data: ResolveReturnDto) => void;
  isLoading: boolean;
}) {
  const [resolution, setResolution] = useState<'APPROVED_RESTOCK' | 'APPROVED_REPLACE' | 'REJECTED'>('APPROVED_RESTOCK');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (resolution === 'REJECTED' && !resolutionNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    onResolve({
      resolution,
      resolutionNotes: resolutionNotes || undefined,
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Resolve Return: ${ret.returnNumber}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-dark-800 rounded-lg p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-dark-400">Retailer:</span>
            <span className="text-white">{ret.retailerName}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-dark-400">Manufacturer:</span>
            <span className="text-white">{ret.manufacturerName}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-dark-400">Reason:</span>
            <span className="text-white">{ret.reason.replace(/_/g, ' ')}</span>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-white mb-2">Items</h4>
          <div className="text-sm space-y-1">
            {ret.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span className="text-dark-300">{item.materialName}</span>
                <span className="text-white">{item.packets} pkt + {item.looseUnits} loose</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="form-label">Resolution</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-dark-800">
              <input
                type="radio"
                checked={resolution === 'APPROVED_RESTOCK'}
                onChange={() => setResolution('APPROVED_RESTOCK')}
                className="form-radio"
              />
              <div>
                <span className="text-white">Approve & Restock</span>
                <p className="text-xs text-dark-400">Items will be added back to manufacturer inventory</p>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-dark-800">
              <input
                type="radio"
                checked={resolution === 'APPROVED_REPLACE'}
                onChange={() => setResolution('APPROVED_REPLACE')}
                className="form-radio"
              />
              <div>
                <span className="text-white">Approve & Replace</span>
                <p className="text-xs text-dark-400">Replacement will be arranged (no inventory change)</p>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-dark-800">
              <input
                type="radio"
                checked={resolution === 'REJECTED'}
                onChange={() => setResolution('REJECTED')}
                className="form-radio"
              />
              <div>
                <span className="text-white">Reject</span>
                <p className="text-xs text-dark-400">Return request not accepted</p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label className="form-label">
            Notes {resolution === 'REJECTED' ? '*' : '(optional)'}
          </label>
          <textarea
            className="form-input"
            rows={3}
            placeholder={resolution === 'REJECTED' 
              ? "Explain why this return is being rejected..." 
              : "Add any notes about the resolution..."
            }
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            required={resolution === 'REJECTED'}
          />
        </div>

        {resolution === 'APPROVED_RESTOCK' && (
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-3">
            <p className="text-sm text-green-400">
              <strong>Note:</strong> Approving with restock will add {ret.items.reduce((sum, i) => sum + i.packets, 0)} packets 
              and {ret.items.reduce((sum, i) => sum + i.looseUnits, 0)} loose units back to the manufacturer's inventory.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isLoading} 
            className={`btn flex-1 ${resolution === 'REJECTED' ? 'bg-red-600 hover:bg-red-700' : 'btn-primary'}`}
          >
            {isLoading ? 'Processing...' : resolution === 'REJECTED' ? 'Reject' : 'Approve'}
          </button>
        </div>
      </form>
    </Modal>
  );
}