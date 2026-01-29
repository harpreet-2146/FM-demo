import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, EmptyState, StatusBadge, StatCard } from '../../components/Layout';
import { dispatchApi, srnApi } from '../../services/api';
import { Truck, Clock, Send, CheckCircle, Package } from 'lucide-react';

export default function AdminDispatch() {
  const { data: dispatches, isLoading: loadingDispatches } = useQuery({
    queryKey: ['dispatches'],
    queryFn: () => dispatchApi.getAll(),
  });

  // Also fetch approved SRNs that are waiting for dispatch creation
  const { data: approvedSRNs, isLoading: loadingApproved } = useQuery({
    queryKey: ['approved-srns'],
    queryFn: () => srnApi.getAll('APPROVED'),
  });

  const { data: partialSRNs, isLoading: loadingPartial } = useQuery({
    queryKey: ['partial-srns'],
    queryFn: () => srnApi.getAll('PARTIAL'),
  });

  const isLoading = loadingDispatches || loadingApproved || loadingPartial;

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const dispatchList = dispatches?.data || [];
  const pendingSRNs = [...(approvedSRNs?.data || []), ...(partialSRNs?.data || [])];

  const pendingCount = dispatchList.filter(d => d.status === 'PENDING').length;
  const inTransitCount = dispatchList.filter(d => d.status === 'IN_TRANSIT').length;
  const deliveredCount = dispatchList.filter(d => d.status === 'DELIVERED').length;

  return (
    <Layout>
      <PageHeader
        title="Dispatch Orders"
        subtitle="Track all dispatch orders - Admin view includes financial data"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <StatCard
          title="Awaiting Dispatch"
          value={pendingSRNs.length}
          subtitle="Approved SRNs"
          icon={Package}
        />
        <StatCard
          title="Total Dispatches"
          value={dispatchList.length}
          icon={Truck}
        />
        <StatCard
          title="Pending"
          value={pendingCount}
          subtitle="Created, not executed"
          icon={Clock}
        />
        <StatCard
          title="In Transit"
          value={inTransitCount}
          icon={Send}
        />
        <StatCard
          title="Delivered"
          value={deliveredCount}
          icon={CheckCircle}
        />
      </div>

      {/* Approved SRNs waiting for Dispatch */}
      {pendingSRNs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Approved SRNs Awaiting Dispatch</h3>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-800">
                  <tr>
                    <th>SRN #</th>
                    <th>Retailer</th>
                    <th>Manufacturer</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Approved At</th>
                    <th>Action Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {pendingSRNs.map((srn) => (
                    <tr key={srn.id} className="hover:bg-dark-800/50">
                      <td className="font-medium text-white">{srn.srnNumber}</td>
                      <td>{srn.retailerName}</td>
                      <td>{srn.manufacturerName || '-'}</td>
                      <td>{srn.items.length} items</td>
                      <td><StatusBadge status={srn.status} /></td>
                      <td>{srn.processedAt ? new Date(srn.processedAt).toLocaleDateString() : '-'}</td>
                      <td>
                        <span className="text-yellow-400 text-sm">
                          Manufacturer must create dispatch
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Dispatch Orders */}
      <h3 className="text-lg font-semibold text-white mb-3">Dispatch Orders</h3>
      {dispatchList.length === 0 ? (
        <Card>
          <EmptyState
            icon={Truck}
            title="No Dispatch Orders"
            description="Dispatch orders are created by manufacturers from approved SRNs."
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
                  <th>Manufacturer</th>
                  <th>Packets</th>
                  <th>Loose Units</th>
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
                    <td>{dispatch.manufacturerName || '-'}</td>
                    <td>{dispatch.totalPackets}</td>
                    <td>{dispatch.totalLooseUnits || 0}</td>
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
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <span className="badge badge-success">SRN APPROVED</span>
              <span className="text-dark-400">→</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">Manufacturer creates dispatch</span>
              <span className="text-dark-400">→</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-warning">PENDING</span>
              <span className="text-dark-400">→</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">Manufacturer executes</span>
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
            After Admin approves an SRN, the <strong>Manufacturer</strong> must create and execute the dispatch. 
            Then the Retailer confirms GRN to complete delivery.
          </p>
        </Card>
      </div>
    </Layout>
  );
}