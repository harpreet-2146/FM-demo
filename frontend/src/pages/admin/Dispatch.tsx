import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, EmptyState, StatusBadge } from '../../components/Layout';
import { dispatchApi } from '../../services/api';
import { Truck } from 'lucide-react';

export default function AdminDispatch() {
  const { data: dispatches, isLoading } = useQuery({
    queryKey: ['dispatches'],
    queryFn: () => dispatchApi.getAll(),
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const dispatchList = dispatches?.data || [];

  return (
    <Layout>
      <PageHeader
        title="Dispatch Orders"
        subtitle="Track all dispatch orders - Admin view includes financial data"
      />

      {dispatchList.length === 0 ? (
        <Card>
          <EmptyState
            icon={Truck}
            title="No Dispatch Orders"
            description="Dispatch orders are created from approved SRNs."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th>Dispatch #</th>
                  <th>SRN #</th>
                  <th>Retailer</th>
                  <th>Total Packets</th>
                  <th>Subtotal</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Executed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {dispatchList.map((dispatch) => (
                  <tr key={dispatch.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{dispatch.dispatchNumber}</td>
                    <td>{dispatch.srnNumber}</td>
                    <td>{dispatch.retailerName}</td>
                    <td>{dispatch.totalPackets}</td>
                    <td className="text-primary-500">
                      {dispatch.subtotal ? `₹${dispatch.subtotal.toFixed(2)}` : '-'}
                    </td>
                    <td><StatusBadge status={dispatch.status} /></td>
                    <td>{new Date(dispatch.createdAt).toLocaleDateString()}</td>
                    <td>
                      {dispatch.executedAt
                        ? new Date(dispatch.executedAt).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="mt-6">
        <Card>
          <h3 className="text-lg font-semibold text-white mb-3">Dispatch Workflow</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="badge badge-warning">PENDING</span>
              <span className="text-dark-400">→</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-info">IN_TRANSIT</span>
              <span className="text-dark-400">→</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-success">DELIVERED</span>
            </div>
          </div>
          <p className="text-dark-400 text-sm mt-3">
            Manufacturer executes dispatch → Status changes to IN_TRANSIT → Retailer confirms GRN → Status changes to DELIVERED
          </p>
        </Card>
      </div>
    </Layout>
  );
}