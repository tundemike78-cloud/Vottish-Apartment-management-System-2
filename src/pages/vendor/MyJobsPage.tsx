import { useEffect, useState } from 'react';
import { Briefcase, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Vendor, WorkOrder, Property } from '../../lib/supabase';

type JobWithProperty = WorkOrder & {
  property?: Property;
};

export function MyJobsPage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [jobs, setJobs] = useState<JobWithProperty[]>([]);
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
        .eq('assigned_vendor_id', vendorData.id)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      setJobs((jobsData as any) || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
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
          <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor Profile Required</h2>
          <p className="text-gray-600">Create a vendor profile to view your jobs.</p>
        </div>
      </div>
    );
  }

  const statusGroups = {
    all: 'All Jobs',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    awaiting_parts: 'Awaiting Parts',
    on_hold: 'On Hold',
    completed: 'Completed',
    closed: 'Closed',
  };

  const filteredJobs = selectedStatus === 'all'
    ? jobs
    : jobs.filter(j => j.status === selectedStatus);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-violet-100 text-violet-800',
      awaiting_parts: 'bg-amber-100 text-amber-800',
      on_hold: 'bg-gray-100 text-gray-800',
      completed: 'bg-emerald-100 text-emerald-800',
      closed: 'bg-slate-100 text-slate-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: 'text-rose-600',
      high: 'text-orange-600',
      normal: 'text-blue-600',
      low: 'text-gray-600',
    };
    return colors[priority] || 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">My Jobs</h1>
          <p className="text-lg text-gray-600">Manage your assigned work orders</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(statusGroups).map(([status, label]) => {
            const count = status === 'all' ? jobs.length : jobs.filter(j => j.status === status).length;
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

        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Briefcase className="h-20 w-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600">No jobs match the selected filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.status)}`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{job.description}</p>
                      <div className="flex items-center flex-wrap gap-4 text-sm">
                        <span className="flex items-center text-gray-600">
                          <Briefcase className="h-4 w-4 mr-1" />
                          {job.category}
                        </span>
                        <span className={`flex items-center font-semibold ${getPriorityColor(job.priority)}`}>
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          {job.priority}
                        </span>
                        {job.sla_due_at && (
                          <span className="flex items-center text-gray-600">
                            <Clock className="h-4 w-4 mr-1" />
                            Due {new Date(job.sla_due_at).toLocaleDateString()}
                          </span>
                        )}
                        {job.property && (
                          <span className="text-gray-600">
                            {job.property.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-violet-700 transition-all duration-200 shadow-lg">
                      View Details
                    </button>
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
