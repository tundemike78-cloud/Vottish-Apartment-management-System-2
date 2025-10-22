import { useEffect, useState } from 'react';
import { Plus, Filter } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, WorkOrder, Property } from '../../lib/supabase';

export function WorkOrdersPage() {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other' as const,
    priority: 'normal' as const,
    property_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (currentOrg) {
      loadData();
    }
  }, [currentOrg]);

  const loadData = async () => {
    if (!currentOrg) return;

    try {
      const [woResponse, propsResponse] = await Promise.all([
        supabase
          .from('work_orders')
          .select('*')
          .eq('org_id', currentOrg.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('properties')
          .select('*')
          .eq('org_id', currentOrg.id)
      ]);

      if (woResponse.error) throw woResponse.error;
      if (propsResponse.error) throw propsResponse.error;

      setWorkOrders(woResponse.data || []);
      setProperties(propsResponse.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSLA = (priority: string): Date => {
    const now = new Date();
    const hours = { critical: 4, high: 24, normal: 72, low: 168 };
    now.setHours(now.getHours() + (hours[priority as keyof typeof hours] || 72));
    return now;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('work_orders')
        .insert({
          org_id: currentOrg.id,
          property_id: formData.property_id,
          created_by: user.id,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          status: 'new',
          sla_due_at: calculateSLA(formData.priority).toISOString(),
        });

      if (error) throw error;

      setShowModal(false);
      setFormData({ title: '', description: '', category: 'other', priority: 'normal', property_id: '' });
      await loadData();
    } catch (error) {
      console.error('Error creating work order:', error);
      alert('Failed to create work order');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
      new: 'info',
      triaged: 'info',
      assigned: 'info',
      in_progress: 'warning',
      awaiting_parts: 'warning',
      on_hold: 'warning',
      completed: 'success',
      closed: 'default',
      cancelled: 'danger',
    };

    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
      critical: 'danger',
      high: 'warning',
      normal: 'info',
      low: 'default',
    };

    return <Badge variant={variants[priority] || 'default'}>{priority}</Badge>;
  };

  const isOverdue = (wo: WorkOrder) => {
    if (!wo.sla_due_at || ['completed', 'closed', 'cancelled'].includes(wo.status)) return false;
    return new Date(wo.sla_due_at) < new Date();
  };

  const filteredWorkOrders = filterStatus === 'all'
    ? workOrders
    : workOrders.filter(wo => wo.status === filterStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-gray-600 mt-1">Manage maintenance requests and tasks</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Work Order
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by status:</span>
            <div className="flex space-x-2">
              {['all', 'new', 'in_progress', 'completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    filterStatus === status
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All' : status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredWorkOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No work orders found</h3>
            <p className="text-gray-600 mb-4">
              {filterStatus === 'all'
                ? 'Create your first work order to get started'
                : 'No work orders with this status'}
            </p>
            {filterStatus === 'all' && (
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Work Order
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredWorkOrders.map((wo) => {
            const property = properties.find(p => p.id === wo.property_id);
            const overdue = isOverdue(wo);

            return (
              <Card key={wo.id} className={`hover:shadow-md transition-shadow ${overdue ? 'border-red-300 border-2' : ''}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{wo.title}</h3>
                        {getPriorityBadge(wo.priority)}
                        {getStatusBadge(wo.status)}
                        {overdue && <Badge variant="danger">OVERDUE</Badge>}
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{wo.description}</p>

                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <span>
                          <span className="font-medium">Category:</span> {wo.category}
                        </span>
                        {property && (
                          <span>
                            <span className="font-medium">Property:</span> {property.name}
                          </span>
                        )}
                        {wo.sla_due_at && (
                          <span>
                            <span className="font-medium">Due:</span>{' '}
                            {new Date(wo.sla_due_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      {wo.cost > 0 && (
                        <p className="text-lg font-semibold text-gray-900">${wo.cost.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Work Order"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Leaking faucet in unit 301"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Describe the issue in detail..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property
            </label>
            <select
              value={formData.property_id}
              onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a property</option>
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="low">Low (7 days)</option>
                <option value="normal">Normal (3 days)</option>
                <option value="high">High (24 hours)</option>
                <option value="critical">Critical (4 hours)</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="submit" isLoading={saving} className="flex-1">
              Create Work Order
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
