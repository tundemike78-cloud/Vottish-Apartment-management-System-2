import { useEffect, useState } from 'react';
import {
  Clock,
  Play,
  Pause,
  CheckCircle,
  Image as ImageIcon,
  Package,
  FileText,
  MessageSquare,
  History,
  Plus,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Vendor, WorkOrder, JobTimeLog, JobChecklistItem, JobPart } from '../../lib/supabase';

type JobDetailPageProps = {
  jobId: string;
  onBack: () => void;
};

export function JobDetailPage({ jobId, onBack }: JobDetailPageProps) {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [job, setJob] = useState<WorkOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'worklog' | 'checklist' | 'media' | 'parts' | 'files' | 'messages' | 'history'>('worklog');
  const [timeLogs, setTimeLogs] = useState<JobTimeLog[]>([]);
  const [checklistItems, setChecklistItems] = useState<JobChecklistItem[]>([]);
  const [parts, setParts] = useState<JobPart[]>([]);
  const [activeLog, setActiveLog] = useState<JobTimeLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPart, setNewPart] = useState({
    name: '',
    quantity: 1,
    unit_cost: 0,
    supplier: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, jobId]);

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

      const [jobRes, timeLogsRes, checklistRes, partsRes] = await Promise.all([
        supabase.from('work_orders').select('*').eq('id', jobId).single(),
        supabase.from('job_time_logs').select('*').eq('work_order_id', jobId).order('started_at', { ascending: false }),
        supabase.from('job_checklist_items').select('*').eq('work_order_id', jobId).order('order_index'),
        supabase.from('job_parts').select('*').eq('work_order_id', jobId).order('created_at', { ascending: false })
      ]);

      if (jobRes.error) throw jobRes.error;
      setJob(jobRes.data);
      setTimeLogs(timeLogsRes.data || []);
      setChecklistItems(checklistRes.data || []);
      setParts(partsRes.data || []);

      const active = (timeLogsRes.data || []).find(log => !log.ended_at);
      setActiveLog(active || null);
    } catch (error) {
      console.error('Error loading job detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTimer = async () => {
    if (!vendor || !job) return;

    try {
      const { data, error } = await supabase
        .from('job_time_logs')
        .insert({
          work_order_id: job.id,
          vendor_id: vendor.id,
          user_id: user!.id,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      setActiveLog(data);
      await loadData();
    } catch (error) {
      console.error('Error starting timer:', error);
      alert('Failed to start timer');
    }
  };

  const handleStopTimer = async () => {
    if (!activeLog) return;

    try {
      const endedAt = new Date();
      const startedAt = new Date(activeLog.started_at);
      const durationMinutes = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000 / 60);

      const { error } = await supabase
        .from('job_time_logs')
        .update({
          ended_at: endedAt.toISOString(),
          duration_minutes: durationMinutes
        })
        .eq('id', activeLog.id);

      if (error) throw error;
      setActiveLog(null);
      await loadData();
    } catch (error) {
      console.error('Error stopping timer:', error);
      alert('Failed to stop timer');
    }
  };

  const handleToggleChecklistItem = async (item: JobChecklistItem) => {
    try {
      const { error } = await supabase
        .from('job_checklist_items')
        .update({
          done: !item.done,
          done_at: !item.done ? new Date().toISOString() : null,
          done_by_id: !item.done ? user!.id : null
        })
        .eq('id', item.id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error toggling checklist item:', error);
      alert('Failed to update checklist');
    }
  };

  const handleAddPart = async () => {
    if (!vendor || !job || !newPart.name) return;

    try {
      const totalCost = newPart.quantity * newPart.unit_cost;

      const { error } = await supabase
        .from('job_parts')
        .insert({
          work_order_id: job.id,
          vendor_id: vendor.id,
          added_by_id: user!.id,
          name: newPart.name,
          quantity: newPart.quantity,
          unit_cost: newPart.unit_cost,
          total_cost: totalCost,
          supplier: newPart.supplier,
          notes: newPart.notes
        });

      if (error) throw error;
      setNewPart({ name: '', quantity: 1, unit_cost: 0, supplier: '', notes: '' });
      await loadData();
    } catch (error) {
      console.error('Error adding part:', error);
      alert('Failed to add part');
    }
  };

  const handleDeletePart = async (partId: string) => {
    if (!confirm('Delete this part?')) return;

    try {
      const { error } = await supabase
        .from('job_parts')
        .delete()
        .eq('id', partId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting part:', error);
      alert('Failed to delete part');
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const totalTime = timeLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
  const totalPartsCost = parts.reduce((sum, part) => sum + part.total_cost, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h2>
          <button onClick={onBack} className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'worklog', label: 'Worklog', icon: Clock },
    { id: 'checklist', label: 'Checklist', icon: CheckCircle },
    { id: 'media', label: 'Photos/Videos', icon: ImageIcon },
    { id: 'parts', label: 'Parts & Costs', icon: Package },
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={onBack}
          className="mb-6 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
        >
          ← Back
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
                <p className="text-gray-600 mb-4">{job.description}</p>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
                    {job.category}
                  </span>
                  <span className="px-3 py-1 bg-violet-100 text-violet-800 rounded-full font-semibold">
                    {job.status.replace('_', ' ')}
                  </span>
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-semibold">
                    {job.priority}
                  </span>
                </div>
              </div>

              <div className="text-right">
                {activeLog ? (
                  <button
                    onClick={handleStopTimer}
                    className="px-6 py-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl font-semibold hover:from-rose-700 hover:to-pink-700 transition-all duration-200 shadow-lg flex items-center"
                  >
                    <Pause className="h-5 w-5 mr-2" />
                    Stop Timer
                  </button>
                ) : (
                  <button
                    onClick={handleStartTimer}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 transition-all duration-200 shadow-lg flex items-center"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Start Timer
                  </button>
                )}
                <p className="text-sm text-gray-600 mt-2">Total: {formatDuration(totalTime)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 px-6 py-4 font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'worklog' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Time Logs</h3>
                {timeLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No time logs yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timeLogs.map((log) => (
                      <div key={log.id} className="p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {new Date(log.started_at).toLocaleString()}
                            </p>
                            {log.ended_at ? (
                              <p className="text-sm text-gray-600">
                                Ended: {new Date(log.ended_at).toLocaleString()}
                              </p>
                            ) : (
                              <p className="text-sm text-emerald-600 font-semibold animate-pulse">
                                ● In Progress
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-600">
                              {formatDuration(log.duration_minutes)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'checklist' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Task Checklist</h3>
                {checklistItems.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No checklist items</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {checklistItems.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center space-x-3 p-4 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => handleToggleChecklistItem(item)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className={`flex-1 ${item.done ? 'line-through text-gray-500' : 'text-gray-900 font-medium'}`}>
                          {item.title}
                        </span>
                        {item.required && (
                          <span className="px-2 py-1 bg-rose-100 text-rose-800 text-xs font-semibold rounded-full">
                            Required
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'media' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Photos & Videos</h3>
                <div className="text-center py-12">
                  <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Media upload coming soon</p>
                  <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold">
                    <Plus className="h-5 w-5 inline mr-2" />
                    Upload Media
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'parts' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Parts & Materials</h3>
                  <p className="text-2xl font-bold text-emerald-600">
                    Total: ${totalPartsCost.toFixed(2)}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Add New Part</h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="Part name"
                      value={newPart.name}
                      onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={newPart.quantity}
                      onChange={(e) => setNewPart({ ...newPart, quantity: parseFloat(e.target.value) || 1 })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Unit cost"
                      value={newPart.unit_cost}
                      onChange={(e) => setNewPart({ ...newPart, unit_cost: parseFloat(e.target.value) || 0 })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Supplier"
                      value={newPart.supplier}
                      onChange={(e) => setNewPart({ ...newPart, supplier: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <button
                    onClick={handleAddPart}
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-lg font-semibold"
                  >
                    <Plus className="h-4 w-4 inline mr-2" />
                    Add Part
                  </button>
                </div>

                {parts.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No parts added yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {parts.map((part) => (
                      <div key={part.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{part.name}</h4>
                          <p className="text-sm text-gray-600">
                            Qty: {part.quantity} × ${part.unit_cost.toFixed(2)}
                            {part.supplier && ` • ${part.supplier}`}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-bold text-gray-900">
                            ${part.total_cost.toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleDeletePart(part.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'files' && (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Files section coming soon</p>
              </div>
            )}

            {activeTab === 'messages' && (
              <div className="text-center py-12">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Messages section coming soon</p>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="text-center py-12">
                <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">History section coming soon</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50">
            Save Draft
          </button>
          <button className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 shadow-lg">
            Mark as Completed
          </button>
        </div>
      </div>
    </div>
  );
}
