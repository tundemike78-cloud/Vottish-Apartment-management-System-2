import { useEffect, useState } from 'react';
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  AlertTriangle,
  Filter,
  Search,
  Send,
  MessageCircle,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Vendor, WorkOrder, Property } from '../../lib/supabase';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

type JobWithProperty = WorkOrder & {
  property?: Property;
};

type Filters = {
  category: string;
  priority: string;
  search: string;
  minPrice: string;
  maxPrice: string;
  maxDistance: string;
};

export function JobsBoardPage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [jobs, setJobs] = useState<JobWithProperty[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobWithProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobWithProperty | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [quoteData, setQuoteData] = useState({
    amount: 0,
    notes: '',
    validUntil: '',
  });
  const [filters, setFilters] = useState<Filters>({
    category: '',
    priority: '',
    search: '',
    minPrice: '',
    maxPrice: '',
    maxDistance: '',
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [jobs, filters]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (vendorError) throw vendorError;
      if (!vendorData) {
        setLoading(false);
        return;
      }

      setVendor(vendorData);

      const { data: jobsData, error: jobsError } = await supabase
        .from('work_orders')
        .select(`
          *,
          property:properties(*)
        `)
        .in('status', ['new', 'triaged'])
        .is('assigned_vendor_id', null)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      setJobs((jobsData as any) || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...jobs];

    if (filters.category) {
      filtered = filtered.filter(j => j.category === filters.category);
    }

    if (filters.priority) {
      filtered = filtered.filter(j => j.priority === filters.priority);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(j =>
        j.title.toLowerCase().includes(search) ||
        j.description.toLowerCase().includes(search)
      );
    }

    if (filters.minPrice) {
      const min = parseFloat(filters.minPrice);
      filtered = filtered.filter(j => j.cost >= min);
    }

    if (filters.maxPrice) {
      const max = parseFloat(filters.maxPrice);
      filtered = filtered.filter(j => j.cost <= max);
    }

    setFilteredJobs(filtered);
  };

  const handleSubmitQuote = async () => {
    if (!vendor || !selectedJob) return;

    try {
      const { error } = await supabase
        .from('quotes')
        .insert({
          work_order_id: selectedJob.id,
          vendor_id: vendor.id,
          amount: quoteData.amount,
          notes: quoteData.notes,
          valid_until: quoteData.validUntil || null,
          status: 'submitted',
        });

      if (error) throw error;

      alert('Quote submitted successfully!');
      setShowQuoteModal(false);
      setSelectedJob(null);
      setQuoteData({ amount: 0, notes: '', validUntil: '' });
      await loadData();
    } catch (error) {
      console.error('Error submitting quote:', error);
      alert('Failed to submit quote');
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
          <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor Profile Required</h2>
          <p className="text-gray-600">Create a vendor profile to access the jobs board.</p>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-rose-100 text-rose-800 border-rose-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      normal: 'bg-blue-100 text-blue-800 border-blue-300',
      low: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Jobs Board</h1>
            <p className="text-lg text-gray-600">Find new work opportunities</p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center shadow-md"
          >
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="hvac">HVAC</option>
                  <option value="painting">Painting</option>
                  <option value="carpentry">Carpentry</option>
                  <option value="appliance">Appliance</option>
                  <option value="pest">Pest Control</option>
                  <option value="landscaping">Landscaping</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Search jobs..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Min Price</label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  placeholder="$0"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Max Price</label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  placeholder="Any"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => setFilters({
                    category: '',
                    priority: '',
                    search: '',
                    minPrice: '',
                    maxPrice: '',
                    maxDistance: '',
                  })}
                  className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-700">
              Showing {filteredJobs.length} of {jobs.length} jobs
            </p>
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Briefcase className="h-20 w-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                onClick={() => setSelectedJob(job)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg mb-2">{job.title}</h3>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(job.priority)}`}>
                        {job.priority} priority
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{job.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="font-medium">{job.category}</span>
                    </div>
                    {job.property && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{job.property.name}</span>
                      </div>
                    )}
                    {job.sla_due_at && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        <span>Due {new Date(job.sla_due_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm font-semibold text-emerald-600">
                      <DollarSign className="h-4 w-4 mr-1" />
                      <span>Budget: ${job.cost.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(job);
                        setShowQuoteModal(true);
                      }}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-violet-700 transition-all duration-200 flex items-center justify-center"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Send Quote
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!selectedJob && !showQuoteModal}
        onClose={() => setSelectedJob(null)}
        title="Job Details"
      >
        {selectedJob && (
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedJob.title}</h3>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(selectedJob.priority)}`}>
                {selectedJob.priority} priority
              </span>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
              <p className="text-gray-600">{selectedJob.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Category</h4>
                <p className="text-gray-600">{selectedJob.category}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Budget</h4>
                <p className="text-emerald-600 font-bold">${selectedJob.cost.toLocaleString()}</p>
              </div>
              {selectedJob.sla_due_at && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Due Date</h4>
                  <p className="text-gray-600">{new Date(selectedJob.sla_due_at).toLocaleDateString()}</p>
                </div>
              )}
              {selectedJob.property && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Location</h4>
                  <p className="text-gray-600">{selectedJob.property.name}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowQuoteModal(true);
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-violet-700 transition-all duration-200"
              >
                <Send className="h-4 w-4 mr-2 inline" />
                Send Quote
              </button>
              <button
                onClick={() => setSelectedJob(null)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showQuoteModal}
        onClose={() => {
          setShowQuoteModal(false);
          setQuoteData({ amount: 0, notes: '', validUntil: '' });
        }}
        title="Submit Quote"
      >
        <div className="space-y-4">
          {selectedJob && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900 mb-1">{selectedJob.title}</h4>
              <p className="text-sm text-gray-600">Budget: ${selectedJob.cost.toLocaleString()}</p>
            </div>
          )}

          <Input
            type="number"
            label="Quote Amount ($)"
            value={quoteData.amount}
            onChange={(e) => setQuoteData({ ...quoteData, amount: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
            required
          />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Valid Until (Optional)
            </label>
            <input
              type="date"
              value={quoteData.validUntil}
              onChange={(e) => setQuoteData({ ...quoteData, validUntil: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={quoteData.notes}
              onChange={(e) => setQuoteData({ ...quoteData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Add any details about your quote, timeline, or requirements..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSubmitQuote}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-violet-700 transition-all duration-200"
            >
              Submit Quote
            </button>
            <button
              onClick={() => {
                setShowQuoteModal(false);
                setQuoteData({ amount: 0, notes: '', validUntil: '' });
              }}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
