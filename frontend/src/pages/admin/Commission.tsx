import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, StatusBadge, EmptyState, StatCard } from '../../components/Layout';
import { commissionApi } from '../../services/api';
import { DollarSign, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminCommission() {
  const queryClient = useQueryClient();

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['commission-summary'],
    queryFn: () => commissionApi.getSummary(),
  });

  const { data: commissions, isLoading } = useQuery({
    queryKey: ['commissions'],
    queryFn: () => commissionApi.getAll(),
  });

  const payMutation = useMutation({
    mutationFn: commissionApi.markPaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['commission-summary'] });
      toast.success('Commission marked as paid');
    },
  });

  if (isLoading || loadingSummary) return <Layout><LoadingSpinner /></Layout>;

  const commissionList = commissions?.data || [];
  const summaryData = summary?.data;

  return (
    <Layout>
      <PageHeader title="Commission Tracking" subtitle="Manage retailer commissions - decoupled from invoices" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Pending" value={`₹${summaryData?.pendingAmount?.toFixed(2) || '0.00'}`} icon={DollarSign} />
        <StatCard title="Total Paid" value={`₹${summaryData?.paidAmount?.toFixed(2) || '0.00'}`} icon={CreditCard} />
        <StatCard title="Total Commissions" value={summaryData?.totalCommissions || 0} />
      </div>

      {commissionList.length === 0 ? (
        <Card>
          <EmptyState
            icon={DollarSign}
            title="No Commissions"
            description="Commissions are created when retailers record sales."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th>Sale #</th>
                  <th>Retailer</th>
                  <th>Units Sold</th>
                  <th>Type</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {commissionList.map((commission) => (
                  <tr key={commission.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{commission.saleNumber}</td>
                    <td>{commission.retailerName}</td>
                    <td>{commission.unitsSold}</td>
                    <td>{commission.commissionType === 'PERCENTAGE' ? '%' : 'Flat'}</td>
                    <td>{commission.commissionType === 'PERCENTAGE' ? `${commission.commissionRate}%` : `₹${commission.commissionRate}`}</td>
                    <td className="font-medium text-primary-500">₹{commission.amount.toFixed(2)}</td>
                    <td><StatusBadge status={commission.status} /></td>
                    <td>
                      {commission.status === 'PENDING' && (
                        <button
                          onClick={() => payMutation.mutate(commission.id)}
                          className="btn btn-success btn-sm"
                          disabled={payMutation.isPending}
                        >
                          Mark Paid
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
    </Layout>
  );
}