import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatusBadge } from '../../components/Layout';
import { materialsApi } from '../../services/api';
import type { Material, CommissionType } from '../../types';
import { Package, Plus, Edit, Trash2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminMaterials() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials', true],
    queryFn: () => materialsApi.getAll(true),
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
      setIsModalOpen(false);
      setEditingMaterial(null);
      toast.success('Material updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update material');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: materialsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material deactivated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to deactivate material');
    },
  });

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setIsModalOpen(true);
  };

  const handleDelete = (material: Material) => {
    if (confirm(`Deactivate "${material.name}"? This will hide it from catalogs.`)) {
      deleteMutation.mutate(material.id);
    }
  };

  if (isLoading) {
    return <Layout><LoadingSpinner /></Layout>;
  }

  const materialList = materials?.data || [];

  return (
    <Layout>
      <PageHeader
        title="Materials"
        subtitle="Manage product catalog - HSN & GST lock after production"
        action={
          <button
            onClick={() => { setEditingMaterial(null); setIsModalOpen(true); }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Add Material
          </button>
        }
      />

      {materialList.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title="No Materials"
            description="Create your first material to start the system. All fields are required - no defaults."
            action={
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary"
              >
                Create First Material
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
                  <th>HSN Code</th>
                  <th>GST %</th>
                  <th>Units/Pkt</th>
                  <th>MRP/Pkt</th>
                  <th>Unit Price</th>
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
                      <span className="flex items-center gap-1">
                        {material.hsnCode}
                        {material.hasProduction && <Lock size={12} className="text-dark-500" />}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1">
                        {material.gstRate}%
                        {material.hasProduction && <Lock size={12} className="text-dark-500" />}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1">
                        {material.unitsPerPacket}
                        <Lock size={12} className="text-dark-500" title="Always immutable" />
                      </span>
                    </td>
                    <td>₹{material.mrpPerPacket.toFixed(2)}</td>
                    <td>₹{material.unitPrice.toFixed(2)}</td>
                    <td>
                      {material.commissionType === 'PERCENTAGE'
                        ? `${material.commissionValue}%`
                        : `₹${material.commissionValue}/unit`}
                    </td>
                    <td>
                      {material.hasProduction ? (
                        <span className="badge badge-success">In Production</span>
                      ) : material.isActive ? (
                        <span className="badge badge-info">Active</span>
                      ) : (
                        <span className="badge badge-gray">Inactive</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(material)}
                          className="p-2 text-dark-400 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        {material.isActive && (
                          <button
                            onClick={() => handleDelete(material)}
                            className="p-2 text-dark-400 hover:text-red-500 transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 size={16} />
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

      <MaterialModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingMaterial(null); }}
        material={editingMaterial}
        onSubmit={(data) => {
          if (editingMaterial) {
            updateMutation.mutate({ id: editingMaterial.id, data });
          } else {
            createMutation.mutate(data);
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
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
  onSubmit: (data: Partial<Material>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hsnCode: '',
    gstRate: '',
    unitsPerPacket: '',
    mrpPerPacket: '',
    commissionType: 'PERCENTAGE' as CommissionType,
    commissionValue: '',
  });

  React.useEffect(() => {
    if (material) {
      setFormData({
        name: material.name,
        description: material.description || '',
        hsnCode: material.hsnCode,
        gstRate: String(material.gstRate),
        unitsPerPacket: String(material.unitsPerPacket),
        mrpPerPacket: String(material.mrpPerPacket),
        commissionType: material.commissionType,
        commissionValue: String(material.commissionValue),
      });
    } else {
      setFormData({
        name: '', description: '', hsnCode: '', gstRate: '',
        unitsPerPacket: '', mrpPerPacket: '',
        commissionType: 'PERCENTAGE', commissionValue: '',
      });
    }
  }, [material, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    if (!formData.name || !formData.hsnCode || !formData.gstRate ||
        !formData.unitsPerPacket || !formData.mrpPerPacket || !formData.commissionValue) {
      toast.error('All fields are required - no defaults allowed');
      return;
    }

    onSubmit({
      name: formData.name,
      description: formData.description || undefined,
      hsnCode: formData.hsnCode,
      gstRate: parseFloat(formData.gstRate),
      unitsPerPacket: parseInt(formData.unitsPerPacket),
      mrpPerPacket: parseFloat(formData.mrpPerPacket),
      commissionType: formData.commissionType,
      commissionValue: parseFloat(formData.commissionValue),
    });
  };

  const isEditing = !!material;
  const isLocked = material?.hasProduction;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Material' : 'Create Material'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Name *</label>
          <input
            type="text"
            className="form-input"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Chocolate Chip Cookies"
            required
          />
        </div>

        <div>
          <label className="form-label">Description</label>
          <textarea
            className="form-input"
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label flex items-center gap-1">
              HSN Code *
              {isLocked && <Lock size={12} className="text-yellow-500" />}
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.hsnCode}
              onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
              placeholder="e.g., 19052031"
              required
              disabled={isLocked}
            />
            {isLocked && <p className="text-xs text-yellow-500 mt-1">Locked after production</p>}
          </div>

          <div>
            <label className="form-label flex items-center gap-1">
              GST Rate (%) *
              {isLocked && <Lock size={12} className="text-yellow-500" />}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-input"
              value={formData.gstRate}
              onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
              placeholder="e.g., 18"
              required
              disabled={isLocked}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label flex items-center gap-1">
              Units Per Packet *
              <Lock size={12} className="text-red-500" />
            </label>
            <input
              type="number"
              min="1"
              className="form-input"
              value={formData.unitsPerPacket}
              onChange={(e) => setFormData({ ...formData, unitsPerPacket: e.target.value })}
              placeholder="e.g., 12"
              required
              disabled={isEditing}
            />
            <p className="text-xs text-red-500 mt-1">Cannot be changed after creation</p>
          </div>

          <div>
            <label className="form-label">MRP Per Packet (₹) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="form-input"
              value={formData.mrpPerPacket}
              onChange={(e) => setFormData({ ...formData, mrpPerPacket: e.target.value })}
              placeholder="e.g., 120.00"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Commission Type *</label>
            <select
              className="form-input"
              value={formData.commissionType}
              onChange={(e) => setFormData({ ...formData, commissionType: e.target.value as CommissionType })}
              required
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FLAT_PER_UNIT">Flat Per Unit</option>
            </select>
          </div>

          <div>
            <label className="form-label">
              Commission Value * {formData.commissionType === 'PERCENTAGE' ? '(%)' : '(₹/unit)'}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-input"
              value={formData.commissionValue}
              onChange={(e) => setFormData({ ...formData, commissionValue: e.target.value })}
              placeholder={formData.commissionType === 'PERCENTAGE' ? 'e.g., 10' : 'e.g., 1.50'}
              required
            />
          </div>
        </div>

        {formData.unitsPerPacket && formData.mrpPerPacket && (
          <div className="bg-dark-800 rounded-lg p-4">
            <p className="text-sm text-dark-400">Calculated Unit Price:</p>
            <p className="text-xl font-bold text-primary-500">
              ₹{(parseFloat(formData.mrpPerPacket) / parseInt(formData.unitsPerPacket)).toFixed(2)} per unit
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">
            {isLoading ? 'Saving...' : isEditing ? 'Update Material' : 'Create Material'}
          </button>
        </div>
      </form>
    </Modal>
  );
}