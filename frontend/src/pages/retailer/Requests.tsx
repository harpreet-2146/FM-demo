import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatusBadge, StatCard } from '../../components/Layout';
import { srnApi, materialsApi, assignmentApi } from '../../services/api';
import type { SRN, CreateSRNDto, Material, AssignedManufacturer } from '../../types';
import { ClipboardList, Plus, Send, FileText, Factory } from 'lucide-react';
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

  // NEW: Get assigned manufacturers
  const { data: assignedMfrs } = useQuery({
    queryKey: ['my-assigned-manufacturers'],
    queryFn: () => assignmentApi.getMyManufacturers(),
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
  const manufacturerList = assignedMfrs?.data || [];

  const draftCount = srnList.filter(s => s.status === 'DRAFT').length;
  const pendingCount = srnList.filter(s => s.status === 'SUBMITTED').length;
  const approvedCount = srnList.filter(s => ['APPROVED', 'PARTIAL'].includes(s.status)).length;

  return (
    <Layout>
      <PageHeader
        title="Stock Requests (SRN)"
        subtitle="Request stock from your assigned manufacturers"
        action={
          manufacturerList.length > 0 ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              New Request
            </button>
          ) : null
        }
      />

      {/* No manufacturers assigned warning */}
      {manufacturerList.length === 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6">
          <p className="text-yellow-400">
            <strong>No manufacturers assigned.</strong> Contact your admin to be assigned to a manufacturer before you can create stock requests.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Requests"
          value={srnList.length}
          icon={ClipboardList}
        />
        <StatCard
          title="Drafts"
          value={draftCount}
          subtitle="Not yet submitted"
          icon={FileText}
        />
        <StatCard
          title="Pending"
          value={pendingCount}
          subtitle="Awaiting approval"
          icon={Send}
        />
        <StatCard
          title="Approved"
          value={approvedCount}
          icon={ClipboardList}
        />
      </div>

      {/* SRN List */}
      {srnList.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No Stock Requests"
            description={manufacturerList.length > 0 
              ? "Create your first stock requisition note to request materials."
              : "You need to be assigned to a manufacturer before creating requests."
            }
            action={manufacturerList.length > 0 ? (
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                Create First Request
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
                  <th>SRN #</th>
                  <th>Manufacturer</th>
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
                    <td>
                      <div className="flex items-center gap-2">
                        <Factory size={16} className="text-primary-400" />
                        {srn.manufacturerName}
                      </div>
                    </td>
                    <td>{srn.items.length} items</td>
                    <td><StatusBadge status={srn.status} /></td>
                    <td>{new Date(srn.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedSRN(srn)}
                          className="text-primary-400 hover:text-primary-300 text-sm"
                        >
                          View
                        </button>
                        {srn.status === 'DRAFT' && (
                          <button
                            onClick={() => submitMutation.mutate(srn.id)}
                            disabled={submitMutation.isPending}
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            Submit
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

      {/* Create SRN Modal */}
      <CreateSRNModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        materials={materialList}
        manufacturers={manufacturerList}
        onCreate={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* View SRN Modal */}
      {selectedSRN && (
        <ViewSRNModal
          srn={selectedSRN}
          onClose={() => setSelectedSRN(null)}
        />
      )}
    </Layout>
  );
}

function CreateSRNModal({
  isOpen,
  onClose,
  materials,
  manufacturers,
  onCreate,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  manufacturers: AssignedManufacturer[];
  onCreate: (data: CreateSRNDto) => void;
  isLoading: boolean;
}) {
  const [manufacturerId, setManufacturerId] = useState('');
  const [items, setItems] = useState<{ materialId: string; requestedPackets: number; requestedLooseUnits: number }[]>([
    { materialId: '', requestedPackets: 0, requestedLooseUnits: 0 }
  ]);

  const handleAddItem = () => {
    setItems([...items, { materialId: '', requestedPackets: 0, requestedLooseUnits: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manufacturerId) {
      toast.error('Please select a manufacturer');
      return;
    }

    const validItems = items.filter(
      item => item.materialId && (item.requestedPackets > 0 || item.requestedLooseUnits > 0)
    );

    if (validItems.length === 0) {
      toast.error('Add at least one item with quantity');
      return;
    }

    onCreate({
      manufacturerId,
      items: validItems.map(item => ({
        materialId: item.materialId,
        requestedPackets: item.requestedPackets,
        requestedLooseUnits: item.requestedLooseUnits || undefined,
      })),
    });
  };

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setManufacturerId('');
      setItems([{ materialId: '', requestedPackets: 0, requestedLooseUnits: 0 }]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Stock Request">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Manufacturer Selection - NEW REQUIRED FIELD */}
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
              <option key={mfr.id} value={mfr.id}>
                {mfr.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-dark-400 mt-1">
            Only manufacturers assigned to you by admin are shown
          </p>
        </div>

        {/* Items */}
        <div className="space-y-3">
          <label className="form-label">Items</label>
          {items.map((item, index) => {
            const selectedMaterial = materials.find(m => m.id === item.materialId);
            return (
              <div key={index} className="bg-dark-800 rounded-lg p-3 space-y-2">
                <div className="flex gap-2">
                  <select
                    className="form-input flex-1"
                    value={item.materialId}
                    onChange={(e) => handleItemChange(index, 'materialId', e.target.value)}
                  >
                    <option value="">Select material...</option>
                    {materials.filter(m => m.isActive).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.sqCode})
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
                      placeholder="0"
                      value={item.requestedPackets || ''}
                      onChange={(e) => handleItemChange(index, 'requestedPackets', parseInt(e.target.value) || 0)}
                    />
                    {selectedMaterial && (
                      <span className="text-xs text-dark-500">
                        {selectedMaterial.unitsPerPacket} units/pkt
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-dark-400">Loose Units</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="0"
                      value={item.requestedLooseUnits || ''}
                      onChange={(e) => handleItemChange(index, 'requestedLooseUnits', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
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
            {isLoading ? 'Creating...' : 'Create Draft'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ViewSRNModal({ srn, onClose }: { srn: SRN; onClose: () => void }) {
  return (
    <Modal isOpen={true} onClose={onClose} title={`SRN: ${srn.srnNumber}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-dark-400">Status:</span>
            <span className="ml-2"><StatusBadge status={srn.status} /></span>
          </div>
          <div>
            <span className="text-dark-400">Manufacturer:</span>
            <span className="ml-2 text-white">{srn.manufacturerName}</span>
          </div>
          <div>
            <span className="text-dark-400">Created:</span>
            <span className="ml-2 text-white">{new Date(srn.createdAt).toLocaleString()}</span>
          </div>
          {srn.submittedAt && (
            <div>
              <span className="text-dark-400">Submitted:</span>
              <span className="ml-2 text-white">{new Date(srn.submittedAt).toLocaleString()}</span>
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
                {srn.status !== 'DRAFT' && srn.status !== 'SUBMITTED' && (
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
                  {srn.status !== 'DRAFT' && srn.status !== 'SUBMITTED' && (
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

        <button onClick={onClose} className="btn btn-secondary w-full">
          Close
        </button>
      </div>
    </Modal>
  );
}