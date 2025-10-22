import { useEffect, useState } from 'react';
import { FileText, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Vendor, Quote, WorkOrder } from '../../lib/supabase';

type QuoteWithJob = Quote & {
  work_order?: WorkOrder;
};

export function QuotesPage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [quotes, setQuotes] = useState<QuoteWithJob[]>([]);
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

      const { data: quotesData, error } = await supabase
        .from('quotes')
        .select(`
          *,
          work_order:work_orders(*)
        `)
        .eq('vendor_id', vendorData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes((quotesData as any) || []);
    } catch (error) {
      console.error('Error loading quotes:', error);
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
          <p className="text-gray-600">Create a vendor profile to manage quotes.</p>
        </div>
      </div>
    );
  }

  const statusGroups = {
    all: 'All Quotes',
    submitted: 'Pending Decision',
    accepted: 'Won',
    rejected: 'Lost',
    withdrawn: 'Withdrawn',
    expired: 'Expired',
  };

  const filteredQuotes = selectedStatus === 'all'
    ? quotes
    : quotes.filter(q => q.status === selectedStatus);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      submitted: 'bg-amber-100 text-amber-800',
      accepted: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-rose-100 text-rose-800',
      withdrawn: 'bg-gray-100 text-gray-800',
      expired: 'bg-slate-100 text-slate-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-5 w-5" />;
      case 'rejected':
        return <XCircle className="h-5 w-5" />;
      case 'submitted':
        return <Clock className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const stats = {
    total: quotes.length,
    submitted: quotes.filter(q => q.status === 'submitted').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    rejected: quotes.filter(q => q.status === 'rejected').length,
    totalValue: quotes.filter(q => q.status === 'accepted').reduce((sum, q) => sum + q.amount, 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">My Quotes</h1>
          <p className="text-lg text-gray-600">Manage your quote submissions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Quotes</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
            <p className="text-3xl font-bold text-gray-900">{stats.submitted}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Won</p>
            <p className="text-3xl font-bold text-gray-900">{stats.accepted}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Value</p>
            <p className="text-3xl font-bold text-gray-900">${stats.totalValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(statusGroups).map(([status, label]) => {
            const count = status === 'all' ? quotes.length : quotes.filter(q => q.status === status).length;
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

        {filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <FileText className="h-20 w-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No quotes found</h3>
            <p className="text-gray-600">No quotes match the selected filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredQuotes.map((quote) => (
              <div
                key={quote.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {quote.work_order?.title || 'Unknown Job'}
                        </h3>
                        <span className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(quote.status)}`}>
                          {getStatusIcon(quote.status)}
                          <span>{quote.status}</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {quote.work_order?.description || 'No description'}
                      </p>
                      {quote.notes && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <p className="text-sm text-gray-700">{quote.notes}</p>
                        </div>
                      )}
                      <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600">
                        <span>Submitted: {new Date(quote.submitted_at).toLocaleDateString()}</span>
                        {quote.valid_until && (
                          <span>Valid Until: {new Date(quote.valid_until).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-6">
                      <p className="text-3xl font-bold text-emerald-600">
                        ${quote.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">{quote.currency}</p>
                    </div>
                  </div>

                  {quote.status === 'submitted' && (
                    <div className="flex space-x-3 pt-4 border-t border-gray-200">
                      <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all">
                        Edit Quote
                      </button>
                      <button className="flex-1 px-4 py-2 bg-rose-50 text-rose-700 rounded-lg font-medium hover:bg-rose-100 transition-all">
                        Withdraw
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
