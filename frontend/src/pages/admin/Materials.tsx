import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatCard } from '../../components/Layout';
import { materialsApi } from '../../services/api';
import type { Material, CreateMaterialDto, CommissionType } from '../../types';
import { Package, Plus, Edit, ToggleLeft, ToggleRight, Barcode } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminMaterials() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials', showInactive],
    queryFn: () => materialsApi.getAll(showInactive),
  });

  const createMutation = useMutation({
    mutationFn: materialsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setIsModalOpen(false);
      toast.success('Material created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create material');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Material> }) =>
      materialsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setEditingMaterial(null);
      toast.success('Material updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update material');
    },
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const materialList = materials?.data || [];
  const activeCount = materialList.filter(m => m.isActive).length;

  return (
    <Layout>
      <PageHeader
        title="Materials"
        subtitle="Manage material catalog with SKU codes, pricing, and commission settings"
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Add Material
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Materials"
          value={materialList.length}
          icon={Package}
        />
        <StatCard
          title="Active"
          value={activeCount}
          icon={ToggleRight}
        />
        <StatCard
          title="Inactive"
          value={materialList.length - activeCount}
          icon={ToggleLeft}
        />
      </div>

      {/* Filter Toggle */}
      <div className="flex justify-end mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="form-checkbox"
          />
          <span className="text-sm text-dark-300">Show inactive materials</span>
        </label>
      </div>

      {/* Materials List */}
      {materialList.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title="No Materials"
            description="Add your first material to start managing your catalog."
            action={
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                Add First Material
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
                  <th>Name</th>
                  <th>SKU Code</th>
                  <th>HSN</th>
                  <th>Units/Pkt</th>
                  <th>MRP/Pkt</th>
                  <th>Unit Price</th>
                  <th>GST</th>
                  <th>Commission</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {materialList.map((material) => (
                  <tr key={material.id} className={`hover:bg-dark-800/50 ${!material.isActive ? 'opacity-50' : ''}`}>
                    <td className="font-medium text-white">{material.name}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Barcode size={14} className="text-primary-400" />
                        <span className="font-mono text-sm">{material.SKUCode}</span>
                      </div>
                    </td>
                    <td className="font-mono text-sm">{material.hsnCode}</td>
                    <td>{material.unitsPerPacket}</td>
                    <td>₹{material.mrpPerPacket.toFixed(2)}</td>
                    <td>₹{material.unitPrice.toFixed(2)}</td>
                    <td>{material.gstRate}%</td>
                    <td>
                      {material.commissionType === 'PERCENTAGE' 
                        ? `${material.commissionValue}%`
                        : `₹${material.commissionValue}/unit`
                      }
                    </td>
                    <td>
                      <span className={`badge ${material.isActive ? 'badge-success' : 'badge-gray'}`}>
                        {material.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setEditingMaterial(material)}
                        className="text-primary-400 hover:text-primary-300"
                      >
                        <Edit size={18} />
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
          <h3 className="text-lg font-semibold text-white mb-3">Material Fields</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-dark-300">
            <div>
              <p><strong className="text-primary-400">SKU Code:</strong> Unique stock-keeping code for inventory operations</p>
              <p className="mt-1"><strong className="text-primary-400">HSN Code:</strong> Harmonized System of Nomenclature for GST</p>
              <p className="mt-1"><strong className="text-primary-400">Units/Packet:</strong> Fixed number of units in one sealed packet</p>
            </div>
            <div>
              <p><strong className="text-primary-400">MRP/Packet:</strong> Maximum retail price per packet</p>
              <p className="mt-1"><strong className="text-primary-400">Unit Price:</strong> B2B selling price per unit (auto-calculated)</p>
              <p className="mt-1"><strong className="text-primary-400">Commission:</strong> Retailer commission per unit sale</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <MaterialModal
        isOpen={isModalOpen || !!editingMaterial}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMaterial(null);
        }}
        material={editingMaterial}
        onSave={(data) => {
          if (editingMaterial) {
            updateMutation.mutate({ id: editingMaterial.id, data });
          } else {
            createMutation.mutate(data as CreateMaterialDto);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </Layout>
  );
}

function MaterialModal({
  isOpen,
  onClose,
  material,
  onSave,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
  onSave: (data: CreateMaterialDto | Partial<Material>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    SKUCode: '',
    description: '',
    hsnCode: '',
    gstRate: 18,
    unitsPerPacket: 1,
    mrpPerPacket: 0,
    commissionType: 'PERCENTAGE' as CommissionType,
    commissionValue: 5,
    isActive: true,
  });

  // Reset form when modal opens/closes or material changes
  React.useEffect(() => {
    if (material) {
      setFormData({
        name: material.name,
        SKUCode: material.SKUCode,
        description: material.description || '',
        hsnCode: material.hsnCode,
        gstRate: material.gstRate,
        unitsPerPacket: material.unitsPerPacket,
        mrpPerPacket: material.mrpPerPacket,
        commissionType: material.commissionType,
        commissionValue: material.commissionValue,
        isActive: material.isActive,
      });
    } else {
      setFormData({
        name: '',
        SKUCode: '',
        description: '',
        hsnCode: '',
        gstRate: 18,
        unitsPerPacket: 1,
        mrpPerPacket: 0,
        commissionType: 'PERCENTAGE',
        commissionValue: 5,
        isActive: true,
      });
    }
  }, [material, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.SKUCode || !formData.hsnCode) {
      toast.error('Name, SKU Code, and HSN Code are required');
      return;
    }

    if (material) {
      // Editing - can't change SKUCode
      const { SKUCode, ...updateData } = formData;
      onSave(updateData);
    } else {
      // Creating - don't send isActive (backend sets default)
      const { isActive, ...createData } = formData;
      onSave(createData);
    }
  };

  // Calculate unit price
  const calculatedUnitPrice = formData.unitsPerPacket > 0 
    ? (formData.mrpPerPacket / formData.unitsPerPacket).toFixed(2)
    : '0.00';

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={material ? 'Edit Material' : 'Add Material'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="form-label">Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Wheat Flour Premium"
              required
            />
          </div>
          
          <div>
            <label className="form-label">SKU Code * {material && <span className="text-dark-500">(immutable)</span>}</label>
            <input
              type="text"
              className="form-input font-mono"
              value={formData.SKUCode}
              onChange={(e) => setFormData({ ...formData, SKUCode: e.target.value.toUpperCase() })}
              placeholder="e.g., WF-001"
              disabled={!!material}
              required
            />
            {!material && (
              <p className="text-xs text-dark-400 mt-1">Unique stock code, cannot be changed later</p>
            )}
          </div>
          
          <div>
            <label className="form-label">HSN Code *</label>
            <input
              type="text"
              className="form-input font-mono"
              value={formData.hsnCode}
              onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
              placeholder="e.g., 1101"
              required
            />
          </div>
        </div>

        <div>
          <label className="form-label">Description</label>
          <textarea
            className="form-input"
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description..."
          />
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="form-label">Units per Packet *</label>
            <input
              type="number"
              min="1"
              className="form-input"
              value={formData.unitsPerPacket}
              onChange={(e) => setFormData({ ...formData, unitsPerPacket: parseInt(e.target.value) || 1 })}
              required
            />
          </div>
          
          <div>
            <label className="form-label">MRP per Packet (₹) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={formData.mrpPerPacket}
              onChange={(e) => setFormData({ ...formData, mrpPerPacket: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>
          
          <div>
            <label className="form-label">Unit Price (₹)</label>
            <input
              type="text"
              className="form-input bg-dark-800"
              value={`₹${calculatedUnitPrice}`}
              disabled
            />
            <p className="text-xs text-dark-500 mt-1">Auto-calculated</p>
          </div>
        </div>

        {/* GST */}
        <div>
          <label className="form-label">GST Rate (%)</label>
          <select
            className="form-input"
            value={formData.gstRate}
            onChange={(e) => setFormData({ ...formData, gstRate: parseInt(e.target.value) })}
          >
            <option value={0}>0%</option>
            <option value={5}>5%</option>
            <option value={12}>12%</option>
            <option value={18}>18%</option>
            <option value={28}>28%</option>
          </select>
        </div>

        {/* Commission */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Commission Type</label>
            <select
              className="form-input"
              value={formData.commissionType}
              onChange={(e) => setFormData({ ...formData, commissionType: e.target.value as CommissionType })}
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FLAT_PER_UNIT">Flat per Unit (₹)</option>
            </select>
          </div>
          
          <div>
            <label className="form-label">
              Commission Value {formData.commissionType === 'PERCENTAGE' ? '(%)' : '(₹)'}
            </label>
            <input
              type="number"
              min="0"
              step={formData.commissionType === 'PERCENTAGE' ? '0.1' : '0.01'}
              className="form-input"
              value={formData.commissionValue}
              onChange={(e) => setFormData({ ...formData, commissionValue: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        {/* Status (only for editing) */}
        {material && (
          <div className="flex items-center gap-3">
            <label className="form-label mb-0">Active</label>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.isActive ? 'bg-primary-600' : 'bg-dark-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">
            {isLoading ? 'Saving...' : material ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}