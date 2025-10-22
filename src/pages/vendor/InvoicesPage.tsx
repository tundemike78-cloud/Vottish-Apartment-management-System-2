import { useEffect, useState } from 'react';
import { FileText, DollarSign, Clock, CheckCircle, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Vendor, Invoice } from '../../lib/supabase';

export function InvoicesPage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!vendorData) return;
      setVendor(vendorData);

      const { data: invoicesData, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('vendor_id', vendorData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(invoicesData || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor Profile Required</h2>
          <p className="text-gray-600">Create a vendor profile to manage invoices.</p>
        </div>
      </div>
    );
  }

  const statusGroups = {
    all: 'All Invoices',
    draft: 'Draft',
    sent: 'Sent',
    partial: 'Partially Paid',
    paid: 'Paid',
    overdue: 'Overdue',
    void: 'Void',
  };

  const filteredInvoices = selectedStatus === 'all'
    ? invoices
    : invoices.filter(i => i.status === selectedStatus);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      partial: 'bg-amber-100 text-amber-800',
      paid: 'bg-emerald-100 text-emerald-800',
      overdue: 'bg-rose-100 text-rose-800',
      void: 'bg-slate-100 text-slate-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5" />;
      case 'sent':
      case 'partial':
        return <Clock className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const stats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    totalRevenue: invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
    outstanding: invoices.filter(i => ['sent', 'partial', 'overdue'].includes(i.status)).reduce((sum, inv) => sum + inv.total, 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Invoices & Payouts</h1>
          <p className="text-lg text-gray-600">Track your payments and earnings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Invoices</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
            <p className="text-3xl font-bold text-gray-900">{stats.sent}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Paid</p>
            <p className="text-3xl font-bold text-gray-900">{stats.paid}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Outstanding Balance</h3>
              <p className="text-sm text-gray-600">Awaiting payment from clients</p>
            </div>
            <p className="text-4xl font-bold text-amber-600">${stats.outstanding.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(statusGroups).map(([status, label]) => {
            const count = status === 'all' ? invoices.length : invoices.filter(i => i.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                  selectedStatus === status
                    ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <FileText className="h-20 w-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-600">No invoices match the selected filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {invoice.invoice_number}
                        </h3>
                        <span className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)}`}>
                          {getStatusIcon(invoice.status)}
                          <span>{invoice.status}</span>
                        </span>
                      </div>
                      <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600">
                        <span>Issued: {new Date(invoice.issued_at).toLocaleDateString()}</span>
                        {invoice.due_at && (
                          <span>Due: {new Date(invoice.due_at).toLocaleDateString()}</span>
                        )}
                        {invoice.paid_at && (
                          <span className="text-emerald-600 font-semibold">
                            Paid: {new Date(invoice.paid_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-6">
                      <p className="text-3xl font-bold text-gray-900">
                        ${invoice.total.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">{invoice.currency}</p>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4 border-t border-gray-200">
                    <button className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-violet-700 transition-all flex items-center justify-center">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </button>
                    {invoice.status === 'draft' && (
                      <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all">
                        Edit Invoice
                      </button>
                    )}
                    {invoice.status === 'draft' && (
                      <button className="flex-1 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-medium hover:bg-emerald-200 transition-all">
                        Send to Client
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
