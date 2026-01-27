import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatCard } from '../../components/Layout';
import { productionApi, materialsApi } from '../../services/api';
import type { CreateProductionBatchDto } from '../../types';
import { Factory, Plus, Package, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManufacturerProduction() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['production-summary'],
    queryFn: () => productionApi.getSummary(),
  });

  const { data: batches } = useQuery({
    queryKey: ['production-batches'],
    queryFn: () => productionApi.getBatches(),
  });

  const { data: materials } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: productionApi.createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-summary'] });
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturer-inventory'] });
      setIsModalOpen(false);
      toast.success('Production batch recorded');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record batch');
    },
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const summaryData = summary?.data;
  const batchList = batches?.data || [];
  const materialList = materials?.data || [];

  return (
    <Layout>
      <PageHeader
        title="Production"
        subtitle="Record production batches to add inventory"
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            New Batch
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Batches"
          value={summaryData?.totalBatches || 0}
          icon={Factory}
        />
        <StatCard
          title="Total Packets Produced"
          value={summaryData?.totalPacketsProduced || 0}
          icon={Package}
        />
        <StatCard
          title="Active Materials"
          value={materialList.length}
          icon={Calendar}
        />
      </div>

      {/* Batch List */}
      {batchList.length === 0 ? (
        <Card>
          <EmptyState
            icon={Factory}
            title="No Production Batches"
            description="Record your first production batch to start tracking inventory."
            action={
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary"
              >
                Record First Batch
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
                  <th>Batch Number</th>
                  <th>Material</th>
                  <th>Packets</th>
                  <th>Manufacture Date</th>
                  <th>Expiry Date</th>
                  <th>HSN Snapshot</th>
                  <th>Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {batchList.map((batch) => (
                  <tr key={batch.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{batch.batchNumber}</td>
                    <td>{batch.materialName}</td>
                    <td className="text-primary-500">{batch.packetsProduced}</td>
                    <td>{new Date(batch.manufactureDate).toLocaleDateString()}</td>
                    <td>{new Date(batch.expiryDate).toLocaleDateString()}</td>
                    <td className="text-dark-400">{batch.hsnCodeSnapshot}</td>
                    <td className="text-dark-400">{new Date(batch.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Batch Modal */}
      <CreateBatchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        materials={materialList}
        onCreate={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </Layout>
  );
}

function CreateBatchModal({
  isOpen,
  onClose,
  materials,
  onCreate,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  materials: { id: string; name: string; hsnCode: string }[];
  onCreate: (data: CreateProductionBatchDto) => void;
  isLoading: boolean;
}) {
  const today = new Date().toISOString().split('T')[0];
  const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    materialId: '',
    batchNumber: '',
    manufactureDate: today,
    expiryDate: oneYearLater,
    packetsProduced: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.materialId || !formData.batchNumber || !formData.packetsProduced) {
      toast.error('All fields are required');
      return;
    }

    const packets = parseInt(formData.packetsProduced);
    if (packets <= 0) {
      toast.error('Packets must be positive');
      return;
    }

    onCreate({
      materialId: formData.materialId,
      batchNumber: formData.batchNumber,
      manufactureDate: formData.manufactureDate,
      expiryDate: formData.expiryDate,
      packetsProduced: packets,
    });
  };

  const selectedMaterial = materials.find(m => m.id === formData.materialId);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Production Batch">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Material *</label>
          <select
            className="form-input"
            value={formData.materialId}
            onChange={(e) => setFormData({ ...formData, materialId: e.target.value })}
            required
          >
            <option value="">Select material...</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          {selectedMaterial && (
            <p className="text-xs text-dark-400 mt-1">HSN: {selectedMaterial.hsnCode}</p>
          )}
        </div>

        <div>
          <label className="form-label">Batch Number *</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g., BATCH-2024-001"
            value={formData.batchNumber}
            onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
            required
          />
          <p className="text-xs text-dark-400 mt-1">Must be unique for your account</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Manufacture Date *</label>
            <input
              type="date"
              className="form-input"
              value={formData.manufactureDate}
              onChange={(e) => setFormData({ ...formData, manufactureDate: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label">Expiry Date *</label>
            <input
              type="date"
              className="form-input"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              min={formData.manufactureDate}
              required
            />
          </div>
        </div>

        <div>
          <label className="form-label">Packets Produced *</label>
          <input
            type="number"
            min="1"
            className="form-input"
            placeholder="e.g., 100"
            value={formData.packetsProduced}
            onChange={(e) => setFormData({ ...formData, packetsProduced: e.target.value })}
            required
          />
        </div>

        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-400">
            <strong>Note:</strong> This will add {formData.packetsProduced || 0} packets to your available inventory.
            {selectedMaterial && ' HSN code will be snapshotted at current value.'}
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">
            {isLoading ? 'Recording...' : 'Record Batch'}
          </button>
        </div>
      </form>
    </Modal>
  );
}