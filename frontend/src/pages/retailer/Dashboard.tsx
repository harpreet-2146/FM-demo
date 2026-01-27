import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Layout, PageHeader, StatCard, LoadingSpinner, Card } from '../../components/Layout';
import { retailerInventoryApi, saleApi, grnApi } from '../../services/api';
import { Package, ShoppingCart, Truck, ArrowRight, DollarSign } from 'lucide-react';

export default function RetailerDashboard() {
  const { data: inventory, isLoading: loadingInv } = useQuery({
    queryKey: ['retailer-inventory'],
    queryFn: () => retailerInventoryApi.getMyInventory(),
  });

  const { data: salesSummary } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: () => saleApi.getSummary(),
  });

  const { data: pendingGRNs } = useQuery({
    queryKey: ['grns-pending'],
    queryFn: () => grnApi.getMy('PENDING'),
  });

  if (loadingInv) return <Layout><LoadingSpinner /></Layout>;

  const inv = inventory?.data;
  const sales = salesSummary?.data;
  const pendingCount = pendingGRNs?.data?.length || 0;

  return (
    <Layout>
      <PageHeader
        title="Retailer Dashboard"
        subtitle="Request stock, receive goods, and record sales"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Materials in Stock"
          value={inv?.totalMaterials || 0}
          icon={Package}
        />
        <StatCard
          title="Total Packets"
          value={inv?.totalPackets || 0}
          subtitle={`+ ${inv?.totalLooseUnits || 0} loose units`}
          icon={Package}
        />
        <StatCard
          title="Total Sales"
          value={sales?.totalSales || 0}
          subtitle={`${sales?.totalUnitsSold || 0} units sold`}
          icon={ShoppingCart}
        />
        <StatCard
          title="Pending Receipts"
          value={pendingCount}
          subtitle={pendingCount > 0 ? 'GRNs to confirm' : 'All clear'}
          icon={Truck}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to="/retailer/requests"
              className="flex items-center justify-between p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-white">Create Stock Request (SRN)</span>
              <ArrowRight size={20} className="text-dark-400" />
            </Link>
            <Link
              to="/retailer/receiving"
              className="flex items-center justify-between p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-white">
                Confirm Receipts
                {pendingCount > 0 && (
                  <span className="ml-2 badge badge-warning">{pendingCount}</span>
                )}
              </span>
              <ArrowRight size={20} className="text-dark-400" />
            </Link>
            <Link
              to="/retailer/sales"
              className="flex items-center justify-between p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-white">Record Sales</span>
              <ArrowRight size={20} className="text-dark-400" />
            </Link>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Revenue</h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-900/50 flex items-center justify-center">
              <DollarSign size={24} className="text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                ₹{(sales?.totalRevenue || 0).toFixed(2)}
              </p>
              <p className="text-sm text-dark-400">Total Sales Revenue</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Sales */}
      {sales?.recentSales && sales.recentSales.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Sales</h3>
            <Link to="/retailer/sales" className="text-primary-500 hover:text-primary-400 text-sm">
              View All →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th>Sale #</th>
                  <th>Material</th>
                  <th>Units</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {sales.recentSales.slice(0, 5).map((sale) => (
                  <tr key={sale.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{sale.saleNumber}</td>
                    <td>{sale.materialName}</td>
                    <td>{sale.unitsSold}</td>
                    <td className="text-primary-500">₹{sale.totalAmount.toFixed(2)}</td>
                    <td>{new Date(sale.createdAt).toLocaleDateString()}</td>
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