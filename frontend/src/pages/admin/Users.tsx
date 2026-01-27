import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatusBadge } from '../../components/Layout';
import { usersApi } from '../../services/api';
import type { User, Role } from '../../types';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'MANUFACTURER' as Role });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      toast.success('User created');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setEditingUser(null);
      toast.success('User updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deactivated');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: { name: formData.name } });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const userList = users?.data || [];

  return (
    <Layout>
      <PageHeader
        title="Users"
        subtitle="Manage system users - no public registration"
        action={
          <button onClick={() => { setEditingUser(null); setFormData({ name: '', email: '', password: '', role: 'MANUFACTURER' }); setIsModalOpen(true); }} className="btn btn-primary flex items-center gap-2">
            <Plus size={20} /> Add User
          </button>
        }
      />

      {userList.length === 0 ? (
        <Card><EmptyState icon={Users} title="No Users" description="Create users to enable the system." /></Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {userList.map((user) => (
                  <tr key={user.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{user.name}</td>
                    <td>{user.email}</td>
                    <td><span className="badge badge-info">{user.role}</span></td>
                    <td>{user.isActive ? <span className="badge badge-success">Active</span> : <span className="badge badge-gray">Inactive</span>}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingUser(user); setFormData({ ...formData, name: user.name }); setIsModalOpen(true); }} className="p-2 text-dark-400 hover:text-white"><Edit size={16} /></button>
                        {user.isActive && (
                          <button onClick={() => { if (confirm('Deactivate user?')) deleteMutation.mutate(user.id); }} className="p-2 text-dark-400 hover:text-red-500"><Trash2 size={16} /></button>
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

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingUser(null); }} title={editingUser ? 'Edit User' : 'Create User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Name</label>
            <input type="text" className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          {!editingUser && (
            <>
              <div>
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div>
                <label className="form-label">Password</label>
                <input type="password" className="form-input" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={8} />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select className="form-input" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}>
                  <option value="ADMIN">Admin</option>
                  <option value="MANUFACTURER">Manufacturer</option>
                  <option value="RETAILER">Retailer</option>
                </select>
              </div>
            </>
          )}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn btn-primary flex-1">{editingUser ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}