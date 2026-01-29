import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatusBadge, StatCard } from '../../components/Layout';
import { returnApi, retailerInventoryApi, assignmentApi } from '../../services/api';
import type { Return, CreateReturnDto, RetailerInventoryItem, AssignedManufacturer, ReturnReason } from '../../types';
import { RotateCcw, Plus, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const RETURN_REASONS: { value: ReturnReason; label: string }[] = [
  { value: 'DAMAGED_GOODS', label: 'Damaged Goods' },
  { value: 'MISSING_UNITS', label: 'Missing Units' },
  { value: 'QUALITY_ISSUE', label: 'Quality Issue' },
  { value: 'WRONG_PRODUCT', label: 'Wrong Product' },
  { value: 'OTHER', label: 'Other' },
];

export default function RetailerReturns() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);

  const { data: returns, isLoading } = useQuery({
    queryKey: ['my-returns'],
    queryFn: () => returnApi.getMy(),
  });

  const { data: inventory } = useQuery({
    queryKey: ['retailer-inventory'],
    queryFn: () => retailerInventoryApi.getMyInventory(),
  });

  const { data: assignedMfrs } = useQuery({
    queryKey: ['my-assigned-manufacturers'],
    queryFn: () => assignmentApi.getMyManufacturers(),
  });

  const createMutation = useMutation({
    mutationFn: returnApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-returns'] });
      setIsModalOpen(false);
      toast.success('Return request created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create return');
    },
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const returnList = returns?.data || [];
  // Handle both response structures: { items: [...] } or direct array
  const inventoryData = inventory?.data;
  const invItems = Array.isArray(inventoryData) 
    ? inventoryData 
    : (inventoryData?.items || []);
  const manufacturerList = assignedMfrs?.data || [];

  const raisedCount = returnList.filter(r => r.status === 'RAISED').length;
  const reviewCount = returnList.filter(r => r.status === 'UNDER_REVIEW').length;
  const resolvedCount = returnList.filter(r => ['APPROVED_RESTOCK', 'APPROVED_REPLACE', 'REJECTED', 'RESOLVED'].includes(r.status)).length;

  return (
    <Layout>
      <PageHeader
        title="Returns"
        subtitle="Report damaged, missing, or defective goods"
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Create Return
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Returns"
          value={returnList.length}
          icon={RotateCcw}
        />
        <StatCard
          title="Raised"
          value={raisedCount}
          subtitle="Awaiting review"
          icon={AlertTriangle}
        />
        <StatCard
          title="Under Review"
          value={reviewCount}
          icon={Clock}
        />
        <StatCard
          title="Resolved"
          value={resolvedCount}
          icon={CheckCircle}
        />
      </div>

      {/* Returns List */}
      {returnList.length === 0 ? (
        <Card>
          <EmptyState
            icon={RotateCcw}
            title="No Returns"
            description="Create a return request when you receive damaged or incorrect goods."
            action={
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                Create First Return
              </button>
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
                    <td>{ret.manufacturerName}</td>
                    <td>{ret.reason.replace(/_/g, ' ')}</td>
                    <td>{ret.items.length}</td>
                    <td><StatusBadge status={ret.status} /></td>
                    <td>{new Date(ret.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => setSelectedReturn(ret)}
                        className="text-primary-400 hover:text-primary-300 text-sm"
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
      )}

      {/* Info Card */}
      <div className="mt-6">
        <Card>
          <h3 className="text-lg font-semibold text-white mb-3">Return Process</h3>
          <div className="space-y-2 text-sm text-dark-300">
            <p>1. <strong>Create Return</strong> - Report damaged, missing, or incorrect goods</p>
            <p>2. <strong>Admin Review</strong> - Your return will be reviewed by admin</p>
            <p>3. <strong>Resolution</strong> - Admin will either:</p>
            <ul className="ml-6 space-y-1">
              <li>• <span className="text-green-400">Approve Restock</span> - Items returned to manufacturer inventory</li>
              <li>• <span className="text-blue-400">Approve Replace</span> - Replacement will be arranged</li>
              <li>• <span className="text-red-400">Reject</span> - Return not accepted with explanation</li>
            </ul>
          </div>
        </Card>
      </div>

      {/* Create Return Modal */}
      <CreateReturnModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        inventory={invItems}
        manufacturers={manufacturerList}
        onCreate={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* View Return Modal */}
      {selectedReturn && (
        <ViewReturnModal
          ret={selectedReturn}
          onClose={() => setSelectedReturn(null)}
        />
      )}
    </Layout>
  );
}

function CreateReturnModal({
  isOpen,
  onClose,
  inventory,
  manufacturers,
  onCreate,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  inventory: RetailerInventoryItem[];
  manufacturers: AssignedManufacturer[];
  onCreate: (data: CreateReturnDto) => void;
  isLoading: boolean;
}) {
  const [manufacturerId, setManufacturerId] = useState('');
  const [reason, setReason] = useState<ReturnReason>('DAMAGED_GOODS');
  const [reasonDetails, setReasonDetails] = useState('');
  const [items, setItems] = useState<{ materialId: string; packets: number; looseUnits: number }[]>([
    { materialId: '', packets: 0, looseUnits: 0 }
  ]);

  const handleAddItem = () => {
    setItems([...items, { materialId: '', packets: 0, looseUnits: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!manufacturerId) {
      toast.error('Select a manufacturer');
      return;
    }

    const validItems = items.filter(item => item.materialId && (item.packets > 0 || item.looseUnits > 0));
    if (validItems.length === 0) {
      toast.error('Add at least one item with quantity');
      return;
    }

    onCreate({
      manufacturerId,
      reason,
      reasonDetails: reasonDetails || undefined,
      items: validItems.map(item => ({
        materialId: item.materialId,
        packets: item.packets || undefined,
        looseUnits: item.looseUnits || undefined,
      })),
    });
  };

  React.useEffect(() => {
    if (!isOpen) {
      setManufacturerId('');
      setReason('DAMAGED_GOODS');
      setReasonDetails('');
      setItems([{ materialId: '', packets: 0, looseUnits: 0 }]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter materials to only show ones in inventory
  const availableMaterials = inventory.filter(inv => inv.totalUnits > 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Return Request">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Manufacturer *</label>
          <select
            className="form-input"
            value={manufacturerId}
            onChange={(e) => setManufacturerId(e.target.value)}
            required
          >
            <option value="">Select manufacturer...</option>
            {manufacturers.map((mfr) => (
              <option key={mfr.id} value={mfr.id}>{mfr.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Reason *</label>
          <select
            className="form-input"
            value={reason}
            onChange={(e) => setReason(e.target.value as ReturnReason)}
            required
          >
            {RETURN_REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Details</label>
          <textarea
            className="form-input"
            rows={2}
            placeholder="Describe the issue in detail..."
            value={reasonDetails}
            onChange={(e) => setReasonDetails(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <label className="form-label">Items to Return</label>
          {items.map((item, index) => (
            <div key={index} className="bg-dark-800 rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <select
                  className="form-input flex-1"
                  value={item.materialId}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[index].materialId = e.target.value;
                    setItems(newItems);
                  }}
                >
                  <option value="">Select material...</option>
                  {availableMaterials.map((inv) => (
                    <option key={inv.materialId} value={inv.materialId}>
                      {inv.materialName} ({inv.totalUnits} units avail)
                    </option>
                  ))}
                </select>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="text-red-400 hover:text-red-300 px-2"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-dark-400">Packets</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={item.packets || ''}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].packets = parseInt(e.target.value) || 0;
                      setItems(newItems);
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-400">Loose Units</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={item.looseUnits || ''}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].looseUnits = parseInt(e.target.value) || 0;
                      setItems(newItems);
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddItem}
            className="text-primary-400 hover:text-primary-300 text-sm"
          >
            + Add Another Item
          </button>
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">
            {isLoading ? 'Creating...' : 'Create Return'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ViewReturnModal({ ret, onClose }: { ret: Return; onClose: () => void }) {
  return (
    <Modal isOpen={true} onClose={onClose} title={`Return: ${ret.returnNumber}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-dark-400">Status:</span>
            <span className="ml-2"><StatusBadge status={ret.status} /></span>
          </div>
          <div>
            <span className="text-dark-400">Manufacturer:</span>
            <span className="ml-2 text-white">{ret.manufacturerName}</span>
          </div>
          <div>
            <span className="text-dark-400">Reason:</span>
            <span className="ml-2 text-white">{ret.reason.replace(/_/g, ' ')}</span>
          </div>
          <div>
            <span className="text-dark-400">Created:</span>
            <span className="ml-2 text-white">{new Date(ret.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {ret.reasonDetails && (
          <div className="text-sm">
            <span className="text-dark-400">Details:</span>
            <p className="text-white mt-1">{ret.reasonDetails}</p>
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
          <div className="bg-dark-800 rounded-lg p-3">
            <p className="text-sm text-dark-400">Resolution Notes:</p>
            <p className="text-white">{ret.resolutionNotes}</p>
            {ret.resolvedAt && (
              <p className="text-xs text-dark-500 mt-2">
                Resolved: {new Date(ret.resolvedAt).toLocaleString()} by {ret.resolverName}
              </p>
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