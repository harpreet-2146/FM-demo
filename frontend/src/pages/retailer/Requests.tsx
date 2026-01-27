import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatusBadge } from '../../components/Layout';
import { srnApi, materialsApi } from '../../services/api';
import type { SRN, CreateSRNDto } from '../../types';
import { ClipboardList, Plus, Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RetailerRequests() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSRN, setSelectedSRN] = useState<SRN | null>(null);

  const { data: srns, isLoading } = useQuery({
    queryKey: ['my-srns'],
    queryFn: () => srnApi.getMy(),
  });

  const { data: materials } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: srnApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-srns'] });
      setIsModalOpen(false);
      toast.success('SRN created as draft');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create SRN');
    },
  });

  const submitMutation = useMutation({
    mutationFn: srnApi.submit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-srns'] });
      toast.success('SRN submitted for approval');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit SRN');
    },
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const srnList = srns?.data || [];
  const materialList = materials?.data || [];

  return (
    <Layout>
      <PageHeader
        title="Stock Requests (SRNs)"
        subtitle="Create and track your stock requisition notes"
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            New Request
          </button>
        }
      />

      {srnList.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No Stock Requests"
            description="Create your first stock request to order materials."
            action={
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary"
              >
                Create Request
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
                  <th>SRN #</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {srnList.map((srn) => (
                  <tr key={srn.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{srn.srnNumber}</td>
                    <td>{srn.items.length} item(s)</td>
                    <td><StatusBadge status={srn.status} /></td>
                    <td>{new Date(srn.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        {srn.status === 'DRAFT' && (
                          <button
                            onClick={() => submitMutation.mutate(srn.id)}
                            className="btn btn-primary btn-sm flex items-center gap-1"
                            disabled={submitMutation.isPending}
                          >
                            <Send size={14} />
                            Submit
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedSRN(srn)}
                          className="btn btn-secondary btn-sm"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create SRN Modal */}
      <CreateSRNModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        materials={materialList}
        onCreate={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* View SRN Modal */}
      {selectedSRN && (
        <Modal isOpen={true} onClose={() => setSelectedSRN(null)} title={`SRN ${selectedSRN.srnNumber}`}>
          <div className="space-y-4">
            <div className="bg-dark-800 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-dark-400">Status:</span>
                  <span className="ml-2"><StatusBadge status={selectedSRN.status} /></span>
                </div>
                <div>
                  <span className="text-dark-400">Created:</span>
                  <span className="ml-2 text-white">{new Date(selectedSRN.createdAt).toLocaleString()}</span>
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
                  <strong>Rejected:</strong> {selectedSRN.rejectionNote}
                </p>
              </div>
            )}

            <button onClick={() => setSelectedSRN(null)} className="btn btn-secondary w-full">
              Close
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}

function CreateSRNModal({
  isOpen,
  onClose,
  materials,
  onCreate,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  materials: { id: string; name: string }[];
  onCreate: (data: CreateSRNDto) => void;
  isLoading: boolean;
}) {
  const [items, setItems] = useState<{ materialId: string; requestedPackets: number }[]>([
    { materialId: '', requestedPackets: 1 },
  ]);

  const addItem = () => {
    setItems([...items, { materialId: '', requestedPackets: 1 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter((item) => item.materialId && item.requestedPackets > 0);
    if (validItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }

    // Check for duplicates
    const materialIds = validItems.map((i) => i.materialId);
    if (new Set(materialIds).size !== materialIds.length) {
      toast.error('Duplicate materials not allowed');
      return;
    }

    onCreate({ items: validItems });
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Stock Request">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2">
              <select
                className="form-input flex-1"
                value={item.materialId}
                onChange={(e) => updateItem(index, 'materialId', e.target.value)}
                required
              >
                <option value="">Select material...</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                className="form-input w-24"
                placeholder="Qty"
                value={item.requestedPackets}
                onChange={(e) => updateItem(index, 'requestedPackets', parseInt(e.target.value) || 0)}
                required
              />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="p-2 text-red-400 hover:text-red-300"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button type="button" onClick={addItem} className="text-primary-500 text-sm hover:underline">
          + Add another item
        </button>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">
            {isLoading ? 'Creating...' : 'Create Draft'}
          </button>
        </div>
      </form>
    </Modal>
  );
}