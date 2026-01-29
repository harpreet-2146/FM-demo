import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatCard } from '../../components/Layout';
import { productionApi, materialsApi } from '../../services/api';
import type { ProductionBatch, CreateProductionBatchDto, Material } from '../../types';
import { Factory, Plus, Package, Barcode } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManufacturerProduction() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['production-summary'],
    queryFn: () => productionApi.getSummary(),
  });

  const { data: materials } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: productionApi.createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-summary'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturer-inventory'] });
      setIsModalOpen(false);
      toast.success('Production batch recorded - inventory updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record production');
    },
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const summaryData = summary?.data;
  const materialList = materials?.data?.filter(m => m.isActive) || [];

  return (
    <Layout>
      <PageHeader
        title="Production"
        subtitle="Record production batches to add packets and loose units to inventory"
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Record Batch
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
          title="Packets Produced"
          value={summaryData?.totalPacketsProduced || 0}
          icon={Package}
        />
        <StatCard
          title="Loose Units Produced"
          value={summaryData?.totalLooseUnitsProduced || 0}
          subtitle="Not in packets"
          icon={Package}
        />
      </div>

      {/* Recent Batches */}
      {summaryData?.recentBatches && summaryData.recentBatches.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-dark-700">
            <h3 className="font-semibold text-white">Recent Production Batches</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th>Batch #</th>
                  <th>Material</th>
                  <th>SQ Code</th>
                  <th>Packets</th>
                  <th>Loose Units</th>
                  <th>Mfg Date</th>
                  <th>Expiry</th>
                  <th>Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {summaryData.recentBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{batch.batchNumber}</td>
                    <td>{batch.materialName}</td>
                    <td>
                      <span className="font-mono text-sm text-primary-400">{batch.sqCode || '-'}</span>
                    </td>
                    <td>{batch.packetsProduced}</td>
                    <td>{batch.looseUnitsProduced || 0}</td>
                    <td>{new Date(batch.manufactureDate).toLocaleDateString()}</td>
                    <td>{new Date(batch.expiryDate).toLocaleDateString()}</td>
                    <td>{new Date(batch.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={Factory}
            title="No Production Batches"
            description="Record your first production batch to add inventory."
            action={
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                Record First Batch
              </button>
            }
          />
        </Card>
      )}

      {/* Info Card */}
      <div className="mt-6">
        <Card>
          <h3 className="text-lg font-semibold text-white mb-3">Production Notes</h3>
          <div className="space-y-2 text-sm text-dark-300">
            <p>• <strong>Packets:</strong> Full sealed packets added to inventory</p>
            <p>• <strong>Loose Units:</strong> Individual units not in a packet (e.g., from broken packets)</p>
            <p>• <strong>SQ Code:</strong> You can enter material by SQ Code instead of selecting from dropdown</p>
            <p>• Recording a batch automatically adds to your available inventory</p>
          </div>
        </Card>
      </div>

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
  materials: Material[];
  onCreate: (data: CreateProductionBatchDto) => void;
  isLoading: boolean;
}) {
  const [useSqCode, setUseSqCode] = useState(false);
  const [materialId, setMaterialId] = useState('');
  const [sqCode, setSqCode] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [manufactureDate, setManufactureDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [packetsProduced, setPacketsProduced] = useState('');
  const [looseUnitsProduced, setLooseUnitsProduced] = useState('');

  const selectedMaterial = useSqCode 
    ? materials.find(m => m.sqCode.toLowerCase() === sqCode.toLowerCase())
    : materials.find(m => m.id === materialId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!batchNumber || !manufactureDate || !expiryDate) {
      toast.error('All required fields must be filled');
      return;
    }

    const packets = parseInt(packetsProduced) || 0;
    const loose = parseInt(looseUnitsProduced) || 0;

    if (packets === 0 && loose === 0) {
      toast.error('Must produce at least some packets or loose units');
      return;
    }

    if (useSqCode) {
      if (!sqCode) {
        toast.error('Enter SQ Code');
        return;
      }
      onCreate({
        sqCode,
        batchNumber,
        manufactureDate,
        expiryDate,
        packetsProduced: packets,
        looseUnitsProduced: loose || undefined,
      });
    } else {
      if (!materialId) {
        toast.error('Select a material');
        return;
      }
      onCreate({
        materialId,
        batchNumber,
        manufactureDate,
        expiryDate,
        packetsProduced: packets,
        looseUnitsProduced: loose || undefined,
      });
    }
  };

  // Generate default batch number
  React.useEffect(() => {
    if (isOpen && !batchNumber) {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      setBatchNumber(`BATCH-${dateStr}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
      setManufactureDate(today.toISOString().slice(0, 10));
    }
  }, [isOpen]);

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setUseSqCode(false);
      setMaterialId('');
      setSqCode('');
      setBatchNumber('');
      setManufactureDate('');
      setExpiryDate('');
      setPacketsProduced('');
      setLooseUnitsProduced('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Production Batch">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Material Selection Method Toggle */}
        <div className="flex gap-4 p-3 bg-dark-800 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!useSqCode}
              onChange={() => setUseSqCode(false)}
              className="form-radio"
            />
            <span className="text-sm">Select Material</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={useSqCode}
              onChange={() => setUseSqCode(true)}
              className="form-radio"
            />
            <span className="text-sm flex items-center gap-1">
              <Barcode size={14} /> Enter SQ Code
            </span>
          </label>
        </div>

        {/* Material Selection */}
        {useSqCode ? (
          <div>
            <label className="form-label">SQ Code *</label>
            <input
              type="text"
              className="form-input font-mono"
              placeholder="e.g., WF-001"
              value={sqCode}
              onChange={(e) => setSqCode(e.target.value.toUpperCase())}
              required
            />
            {sqCode && selectedMaterial && (
              <p className="text-sm text-green-400 mt-1">
                ✓ Found: {selectedMaterial.name}
              </p>
            )}
            {sqCode && !selectedMaterial && sqCode.length >= 3 && (
              <p className="text-sm text-yellow-400 mt-1">
                Material not found - will be validated on server
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="form-label">Material *</label>
            <select
              className="form-input"
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              required
            >
              <option value="">Select material...</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.sqCode})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Batch Details */}
        <div>
          <label className="form-label">Batch Number *</label>
          <input
            type="text"
            className="form-input"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            placeholder="e.g., BATCH-20260129-001"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Manufacture Date *</label>
            <input
              type="date"
              className="form-input"
              value={manufactureDate}
              onChange={(e) => setManufactureDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label">Expiry Date *</label>
            <input
              type="date"
              className="form-input"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              min={manufactureDate}
              required
            />
          </div>
        </div>

        {/* Quantities */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Packets Produced</label>
            <input
              type="number"
              min="0"
              className="form-input"
              placeholder="e.g., 100"
              value={packetsProduced}
              onChange={(e) => setPacketsProduced(e.target.value)}
            />
            {selectedMaterial && (
              <p className="text-xs text-dark-400 mt-1">
                = {(parseInt(packetsProduced) || 0) * selectedMaterial.unitsPerPacket} units
              </p>
            )}
          </div>
          <div>
            <label className="form-label">Loose Units</label>
            <input
              type="number"
              min="0"
              className="form-input"
              placeholder="e.g., 0"
              value={looseUnitsProduced}
              onChange={(e) => setLooseUnitsProduced(e.target.value)}
            />
            <p className="text-xs text-dark-400 mt-1">
              Not in packets
            </p>
          </div>
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