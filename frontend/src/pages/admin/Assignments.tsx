import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatCard } from '../../components/Layout';
import { assignmentApi, usersApi } from '../../services/api';
import type { Assignment, CreateAssignmentDto, User } from '../../types';
import { Link2, Plus, Unlink, Factory, Store, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminAssignments() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments', filter],
    queryFn: () => assignmentApi.getAll(filter !== 'inactive'),
  });

  const { data: manufacturers } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => usersApi.getManufacturers(),
  });

  const { data: retailers } = useQuery({
    queryKey: ['retailers'],
    queryFn: () => usersApi.getRetailers(),
  });

  const createMutation = useMutation({
    mutationFn: assignmentApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setIsModalOpen(false);
      toast.success('Assignment created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create assignment');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: assignmentApi.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Assignment deactivated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to deactivate assignment');
    },
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const assignmentList = assignments?.data || [];
  const manufacturerList = manufacturers?.data || [];
  const retailerList = retailers?.data || [];

  const activeCount = assignmentList.filter(a => a.isActive).length;

  // Group assignments by retailer for display
  const byRetailer = assignmentList.reduce((acc, assignment) => {
    if (!acc[assignment.retailerId]) {
      acc[assignment.retailerId] = {
        retailerName: assignment.retailerName,
        retailers: [],
      };
    }
    acc[assignment.retailerId].retailers.push(assignment);
    return acc;
  }, {} as Record<string, { retailerName: string; retailers: Assignment[] }>);

  return (
    <Layout>
      <PageHeader
        title="Manufacturer Assignments"
        subtitle="Control which manufacturers each retailer can order from"
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            New Assignment
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Assignments"
          value={assignmentList.length}
          icon={Link2}
        />
        <StatCard
          title="Active"
          value={activeCount}
          icon={CheckCircle}
        />
        <StatCard
          title="Manufacturers"
          value={manufacturerList.length}
          icon={Factory}
        />
        <StatCard
          title="Retailers"
          value={retailerList.length}
          icon={Store}
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['active', 'all', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-dark-800 text-dark-300 hover:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Assignments List */}
      {assignmentList.length === 0 ? (
        <Card>
          <EmptyState
            icon={Link2}
            title="No Assignments"
            description="Create assignments to control which manufacturers each retailer can order from."
            action={
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                Create First Assignment
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
                  <th>Retailer</th>
                  <th>Manufacturer</th>
                  <th>Assigned By</th>
                  <th>Assigned At</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {assignmentList.map((assignment) => (
                  <tr key={assignment.id} className={`hover:bg-dark-800/50 ${!assignment.isActive ? 'opacity-50' : ''}`}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Store size={16} className="text-blue-400" />
                        <div>
                          <div className="font-medium text-white">{assignment.retailerName}</div>
                          <div className="text-xs text-dark-400">{assignment.retailerEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Factory size={16} className="text-primary-400" />
                        <div>
                          <div className="text-white">{assignment.manufacturerName}</div>
                          <div className="text-xs text-dark-400">{assignment.manufacturerEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-dark-300">{assignment.assignedByName}</td>
                    <td className="text-dark-300">{new Date(assignment.assignedAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${assignment.isActive ? 'badge-success' : 'badge-gray'}`}>
                        {assignment.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {assignment.isActive && (
                        <button
                          onClick={() => {
                            if (confirm('Deactivate this assignment? The retailer will no longer be able to create SRNs for this manufacturer.')) {
                              deactivateMutation.mutate(assignment.id);
                            }
                          }}
                          disabled={deactivateMutation.isPending}
                          className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
                        >
                          <Unlink size={14} />
                          Deactivate
                        </button>
                      )}
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
          <h3 className="text-lg font-semibold text-white mb-3">Why Assignments Matter</h3>
          <div className="space-y-2 text-sm text-dark-300">
            <p>• Retailers can <strong>only</strong> create SRNs for manufacturers they are assigned to</p>
            <p>• This prevents inventory from being blocked across all manufacturers</p>
            <p>• Each retailer-manufacturer pair needs an active assignment</p>
            <p>• Deactivating an assignment prevents future SRNs but doesn't affect existing ones</p>
          </div>
        </Card>
      </div>

      {/* Create Assignment Modal */}
      <CreateAssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        manufacturers={manufacturerList}
        retailers={retailerList}
        existingAssignments={assignmentList}
        onCreate={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </Layout>
  );
}

function CreateAssignmentModal({
  isOpen,
  onClose,
  manufacturers,
  retailers,
  existingAssignments,
  onCreate,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  manufacturers: User[];
  retailers: User[];
  existingAssignments: Assignment[];
  onCreate: (data: CreateAssignmentDto) => void;
  isLoading: boolean;
}) {
  const [retailerId, setRetailerId] = useState('');
  const [manufacturerId, setManufacturerId] = useState('');

  // Check if assignment already exists
  const existingActive = existingAssignments.find(
    a => a.retailerId === retailerId && a.manufacturerId === manufacturerId && a.isActive
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!retailerId || !manufacturerId) {
      toast.error('Select both retailer and manufacturer');
      return;
    }

    if (existingActive) {
      toast.error('This assignment already exists');
      return;
    }

    onCreate({ retailerId, manufacturerId });
  };

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setRetailerId('');
      setManufacturerId('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter out inactive users
  const activeRetailers = retailers.filter(r => r.isActive);
  const activeManufacturers = manufacturers.filter(m => m.isActive);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Assignment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Retailer *</label>
          <select
            className="form-input"
            value={retailerId}
            onChange={(e) => setRetailerId(e.target.value)}
            required
          >
            <option value="">Select retailer...</option>
            {activeRetailers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Manufacturer *</label>
          <select
            className="form-input"
            value={manufacturerId}
            onChange={(e) => setManufacturerId(e.target.value)}
            required
          >
            <option value="">Select manufacturer...</option>
            {activeManufacturers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.email})
              </option>
            ))}
          </select>
        </div>

        {existingActive && (
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-400">
              This assignment already exists and is active.
            </p>
          </div>
        )}

        {retailerId && manufacturerId && !existingActive && (
          <div className="bg-dark-800 rounded-lg p-3">
            <p className="text-sm text-dark-300">
              This will allow <strong className="text-white">{retailers.find(r => r.id === retailerId)?.name}</strong> to 
              create stock requests for <strong className="text-white">{manufacturers.find(m => m.id === manufacturerId)?.name}</strong>.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isLoading || !!existingActive} 
            className="btn btn-primary flex-1"
          >
            {isLoading ? 'Creating...' : 'Create Assignment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}