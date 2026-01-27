import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, PageHeader, LoadingSpinner, Card, Modal, EmptyState, StatusBadge } from '../../components/Layout';
import { invoiceApi, grnApi } from '../../services/api';
import type { Invoice, GRN } from '../../types';
import { Receipt, Plus, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminInvoices() {
  const queryClient = useQueryClient();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoiceApi.getAll(),
  });

  const { data: confirmedGRNs } = useQuery({
    queryKey: ['grns-confirmed'],
    queryFn: () => grnApi.getAll('CONFIRMED'),
  });

  const generateMutation = useMutation({
    mutationFn: ({ grnId, isInterstate }: { grnId: string; isInterstate: boolean }) =>
      invoiceApi.generate(grnId, isInterstate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['grns-confirmed'] });
      setShowGenerateModal(false);
      toast.success('Invoice generated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate invoice');
    },
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const invoiceList = invoices?.data || [];
  const grnsWithoutInvoice = (confirmedGRNs?.data || []).filter((grn: GRN) => !grn.hasInvoice);

  return (
    <Layout>
      <PageHeader
        title="Invoices"
        subtitle="B2B GST-compliant invoices - IMMUTABLE after generation"
        action={
          grnsWithoutInvoice.length > 0 && (
            <button
              onClick={() => setShowGenerateModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Generate Invoice
            </button>
          )
        }
      />

      {invoiceList.length === 0 ? (
        <Card>
          <EmptyState
            icon={Receipt}
            title="No Invoices"
            description="Invoices are generated from confirmed GRNs."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th>Invoice #</th>
                  <th>GRN #</th>
                  <th>Retailer</th>
                  <th>Subtotal</th>
                  <th>Tax</th>
                  <th>Total</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {invoiceList.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-dark-800/50">
                    <td className="font-medium text-white">{invoice.invoiceNumber}</td>
                    <td>{invoice.grnNumber}</td>
                    <td>{invoice.retailerName}</td>
                    <td>₹{invoice.subtotal.toFixed(2)}</td>
                    <td>
                      {invoice.isInterstate
                        ? `IGST: ₹${invoice.igst?.toFixed(2)}`
                        : `CGST/SGST: ₹${((invoice.cgst || 0) + (invoice.sgst || 0)).toFixed(2)}`}
                    </td>
                    <td className="font-medium text-primary-500">₹{invoice.totalAmount.toFixed(2)}</td>
                    <td>
                      <span className={`badge ${invoice.isInterstate ? 'badge-info' : 'badge-success'}`}>
                        {invoice.isInterstate ? 'Interstate' : 'Intrastate'}
                      </span>
                    </td>
                    <td>{new Date(invoice.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="btn btn-secondary btn-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Generate Invoice Modal */}
      {showGenerateModal && (
        <GenerateInvoiceModal
          grns={grnsWithoutInvoice}
          onClose={() => setShowGenerateModal(false)}
          onGenerate={(grnId, isInterstate) => generateMutation.mutate({ grnId, isInterstate })}
          isLoading={generateMutation.isPending}
        />
      )}

      {/* View Invoice Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </Layout>
  );
}

function GenerateInvoiceModal({
  grns,
  onClose,
  onGenerate,
  isLoading,
}: {
  grns: GRN[];
  onClose: () => void;
  onGenerate: (grnId: string, isInterstate: boolean) => void;
  isLoading: boolean;
}) {
  const [selectedGRN, setSelectedGRN] = useState('');
  const [isInterstate, setIsInterstate] = useState(false);

  return (
    <Modal isOpen={true} onClose={onClose} title="Generate Invoice">
      <div className="space-y-4">
        <div>
          <label className="form-label">Select Confirmed GRN *</label>
          <select
            className="form-input"
            value={selectedGRN}
            onChange={(e) => setSelectedGRN(e.target.value)}
          >
            <option value="">Select GRN...</option>
            {grns.map((grn) => (
              <option key={grn.id} value={grn.id}>
                {grn.grnNumber} - {grn.retailerName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="interstate"
            checked={isInterstate}
            onChange={(e) => setIsInterstate(e.target.checked)}
            className="rounded bg-dark-800 border-dark-600"
          />
          <label htmlFor="interstate" className="text-dark-300">
            Interstate transaction (IGST instead of CGST/SGST)
          </label>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-400">
            <strong>Warning:</strong> Invoices are IMMUTABLE after generation. They cannot be modified or deleted.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={() => selectedGRN && onGenerate(selectedGRN, isInterstate)}
            disabled={!selectedGRN || isLoading}
            className="btn btn-primary flex-1"
          >
            {isLoading ? 'Generating...' : 'Generate Invoice'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function InvoiceDetailModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  return (
    <Modal isOpen={true} onClose={onClose} title={`Invoice ${invoice.invoiceNumber}`}>
      <div className="space-y-4">
        {/* Header Info */}
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-dark-400">Retailer:</span>
              <span className="ml-2 text-white">{invoice.retailerName}</span>
            </div>
            <div>
              <span className="text-dark-400">GRN:</span>
              <span className="ml-2 text-white">{invoice.grnNumber}</span>
            </div>
            <div>
              <span className="text-dark-400">Date:</span>
              <span className="ml-2 text-white">{new Date(invoice.createdAt).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-dark-400">Type:</span>
              <span className={`ml-2 badge ${invoice.isInterstate ? 'badge-info' : 'badge-success'}`}>
                {invoice.isInterstate ? 'Interstate' : 'Intrastate'}
              </span>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <h4 className="font-medium text-white mb-2">Items</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-dark-800">
                <tr>
                  <th className="text-left">Material</th>
                  <th>HSN</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="text-white">{item.materialName}</td>
                    <td className="text-center">{item.hsnCode}</td>
                    <td className="text-center">{item.packets} pkt</td>
                    <td className="text-center">₹{item.unitPrice.toFixed(2)}</td>
                    <td className="text-right">₹{item.lineTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-400">Subtotal:</span>
              <span className="text-white">₹{invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.isInterstate ? (
              <div className="flex justify-between">
                <span className="text-dark-400">IGST:</span>
                <span className="text-white">₹{invoice.igst?.toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-dark-400">CGST:</span>
                  <span className="text-white">₹{invoice.cgst?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">SGST:</span>
                  <span className="text-white">₹{invoice.sgst?.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between pt-2 border-t border-dark-600">
              <span className="font-medium text-white">Total:</span>
              <span className="font-bold text-primary-500">₹{invoice.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="btn btn-secondary w-full">
          Close
        </button>
      </div>
    </Modal>
  );
}