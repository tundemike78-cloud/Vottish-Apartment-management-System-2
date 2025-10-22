import { useEffect, useState } from 'react';
import {
  Briefcase,
  Clock,
  AlertTriangle,
  DollarSign,
  Star,
  Calendar,
  FileText,
  TrendingUp,
  CheckCircle,
  Package
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Vendor, WorkOrder, Invoice, Quote, VendorNotification } from '../../lib/supabase';

type DashboardStats = {
  openJobs: number;
  awaitingApproval: number;
  scheduledToday: number;
  overdue: number;
  unpaidInvoices: number;
  avgRating: number;
  totalEarnings: number;
  activeQuotes: number;
};

export function VendorDashboardPage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    openJobs: 0,
    awaitingApproval: 0,
    scheduledToday: 0,
    overdue: 0,
    unpaidInvoices: 0,
    avgRating: 0,
    totalEarnings: 0,
    activeQuotes: 0,
  });
  const [recentJobs, setRecentJobs] = useState<WorkOrder[]>([]);
  const [notifications, setNotifications] = useState<VendorNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
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

      const [workOrdersRes, invoicesRes, quotesRes, notificationsRes] = await Promise.all([
        supabase
          .from('work_orders')
          .select('*')
          .eq('assigned_vendor_id', vendorData.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('invoices')
          .select('*')
          .eq('vendor_id', vendorData.id),
        supabase
          .from('quotes')
          .select('*')
          .eq('vendor_id', vendorData.id),
        supabase
          .from('vendor_notifications')
          .select('*')
          .eq('vendor_id', vendorData.id)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      if (workOrdersRes.error) throw workOrdersRes.error;
      if (invoicesRes.error) throw invoicesRes.error;
      if (quotesRes.error) throw quotesRes.error;
      if (notificationsRes.error) throw notificationsRes.error;

      const jobs = workOrdersRes.data || [];
      const invoices = invoicesRes.data || [];
      const quotes = quotesRes.data || [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      setStats({
        openJobs: jobs.filter(j => ['assigned', 'in_progress'].includes(j.status)).length,
        awaitingApproval: jobs.filter(j => j.status === 'completed').length,
        scheduledToday: jobs.filter(j => {
          if (!j.sla_due_at) return false;
          const dueDate = new Date(j.sla_due_at);
          return dueDate >= today && dueDate < tomorrow;
        }).length,
        overdue: jobs.filter(j => {
          if (!j.sla_due_at || j.status === 'completed' || j.status === 'closed') return false;
          return new Date(j.sla_due_at) < today;
        }).length,
        unpaidInvoices: invoices.filter(i => ['sent', 'overdue'].includes(i.status)).length,
        avgRating: vendorData.rating,
        totalEarnings: invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
        activeQuotes: quotes.filter(q => q.status === 'submitted').length,
      });

      setRecentJobs(jobs.slice(0, 5));
      setNotifications(notificationsRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
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
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor Profile Required</h2>
          <p className="text-gray-600 mb-6">You need to create a vendor profile to access the vendor dashboard.</p>
          <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-violet-700 transition-all duration-200 shadow-lg">
            Create Vendor Profile
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Open Jobs',
      value: stats.openJobs,
      icon: Briefcase,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100',
      textColor: 'text-blue-700'
    },
    {
      title: 'Awaiting Approval',
      value: stats.awaitingApproval,
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'from-amber-50 to-amber-100',
      textColor: 'text-amber-700'
    },
    {
      title: 'Scheduled Today',
      value: stats.scheduledToday,
      icon: Calendar,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'from-emerald-50 to-emerald-100',
      textColor: 'text-emerald-700'
    },
    {
      title: 'Overdue',
      value: stats.overdue,
      icon: AlertTriangle,
      color: 'from-rose-500 to-rose-600',
      bgColor: 'from-rose-50 to-rose-100',
      textColor: 'text-rose-700'
    },
    {
      title: 'Unpaid Invoices',
      value: stats.unpaidInvoices,
      icon: FileText,
      color: 'from-violet-500 to-violet-600',
      bgColor: 'from-violet-50 to-violet-100',
      textColor: 'text-violet-700'
    },
    {
      title: 'Average Rating',
      value: stats.avgRating.toFixed(1),
      icon: Star,
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'from-yellow-50 to-yellow-100',
      textColor: 'text-yellow-700',
      suffix: '/5.0'
    },
    {
      title: 'Total Earnings',
      value: `$${stats.totalEarnings.toLocaleString()}`,
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100',
      textColor: 'text-green-700'
    },
    {
      title: 'Active Quotes',
      value: stats.activeQuotes,
      icon: TrendingUp,
      color: 'from-cyan-500 to-cyan-600',
      bgColor: 'from-cyan-50 to-cyan-100',
      textColor: 'text-cyan-700'
    },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-violet-100 text-violet-800',
      awaiting_parts: 'bg-amber-100 text-amber-800',
      completed: 'bg-emerald-100 text-emerald-800',
      on_hold: 'bg-gray-100 text-gray-800',
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
            Vendor Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Welcome back, {vendor.company_name}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-200"
              >
                <div className={`h-2 bg-gradient-to-r ${card.color}`} />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${card.bgColor}`}>
                      <Icon className={`h-6 w-6 ${card.textColor}`} />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {card.value}
                    {card.suffix && <span className="text-lg text-gray-600">{card.suffix}</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Recent Jobs
                </h2>
              </div>
              <div className="p-6">
                {recentJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No jobs yet</p>
                    <p className="text-gray-400 text-sm mt-2">Check the Jobs Board for new opportunities</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentJobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200 cursor-pointer"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-bold text-gray-900">{job.title}</h3>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.status)}`}>
                              {job.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{job.category}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className={`flex items-center ${getPriorityColor(job.priority)}`}>
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {job.priority}
                            </span>
                            {job.sla_due_at && (
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Due {new Date(job.sla_due_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <CheckCircle className="h-5 w-5 text-gray-400" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button className="px-6 py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-violet-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Find Jobs
              </button>
              <button className="px-6 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center justify-center">
                <FileText className="h-5 w-5 mr-2" />
                My Quotes
              </button>
              <button className="px-6 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center justify-center">
                <Calendar className="h-5 w-5 mr-2" />
                Today's Schedule
              </button>
              <button className="px-6 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center justify-center">
                <Package className="h-5 w-5 mr-2" />
                Documents
              </button>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-violet-600 to-pink-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Notifications
                </h2>
              </div>
              <div className="p-6">
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">All caught up!</p>
                    <p className="text-gray-400 text-sm mt-2">No new notifications</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-4 bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-200 rounded-xl hover:shadow-md transition-all duration-200 cursor-pointer"
                      >
                        <h4 className="font-semibold text-gray-900 mb-1">{notification.title}</h4>
                        <p className="text-sm text-gray-600">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
