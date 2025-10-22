import { useState, useEffect } from 'react';
import { ArrowLeft, Wrench, Package, Users, Shield, FileText, BarChart3, Plus } from 'lucide-react';
import { supabase, type Property, type Unit, type WorkOrder, type Order } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { WorkOrderCreateModal } from '../../components/modals/WorkOrderCreateModal';
import { GasOrderModal } from '../../components/modals/GasOrderModal';
import { VisitorPassModal } from '../../components/modals/VisitorPassModal';

interface PropertyHubPageProps {
  propertyId: string;
  onBack: () => void;
}

type Tab = 'overview' | 'work-orders' | 'gas' | 'units' | 'visitor-passes' | 'leases';

export function PropertyHubPage({ propertyId, onBack }: PropertyHubPageProps) {
  const [property, setProperty] = useState<Property | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [showGasOrderModal, setShowGasOrderModal] = useState(false);
  const [showVisitorPassModal, setShowVisitorPassModal] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [gasOrders, setGasOrders] = useState<Order[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  useEffect(() => {
    loadPropertyData();
  }, [propertyId]);

  const loadPropertyData = async () => {
    try {
      setLoading(true);

      const [propertyRes, workOrdersRes, gasOrdersRes, unitsRes] = await Promise.all([
        supabase.from('properties').select('*').eq('id', propertyId).single(),
        supabase.from('work_orders').select('*').eq('property_id', propertyId).order('created_at', { ascending: false }),
        supabase.from('orders').select('*').eq('property_id', propertyId).order('created_at', { ascending: false }),
        supabase.from('units').select('*').eq('property_id', propertyId).order('unit_number'),
      ]);

      if (propertyRes.data) setProperty(propertyRes.data);
      if (workOrdersRes.data) setWorkOrders(workOrdersRes.data);
      if (gasOrdersRes.data) setGasOrders(gasOrdersRes.data);
      if (unitsRes.data) setUnits(unitsRes.data);
    } catch (error) {
      console.error('Error loading property:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Property not found</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: BarChart3 },
    { id: 'work-orders' as Tab, label: 'Work Orders', icon: Wrench },
    { id: 'gas' as Tab, label: 'Gas Orders', icon: Package },
    { id: 'units' as Tab, label: 'Units', icon: Users },
    { id: 'visitor-passes' as Tab, label: 'Visitor Passes', icon: Shield },
    { id: 'leases' as Tab, label: 'Leases', icon: FileText },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
      new: 'info',
      in_progress: 'warning',
      completed: 'success',
      cancelled: 'danger',
      pending: 'info',
      confirmed: 'success',
      delivered: 'success',
    };
    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
          <p className="text-gray-600">{property.address}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowWorkOrderModal(true)}>
            <Wrench className="h-4 w-4 mr-2" />
            New Work Order
          </Button>
          <Button onClick={() => setShowGasOrderModal(true)}>
            <Package className="h-4 w-4 mr-2" />
            Order Gas
          </Button>
          <Button variant="secondary" onClick={() => setShowVisitorPassModal(true)}>
            <Shield className="h-4 w-4 mr-2" />
            Visitor Pass
          </Button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <div className="p-6">
                <h3 className="text-sm font-medium text-gray-500">Total Units</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">{units.length}</p>
              </div>
            </Card>
            <Card>
              <div className="p-6">
                <h3 className="text-sm font-medium text-gray-500">Open Work Orders</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {workOrders.filter(wo => !['completed', 'closed', 'cancelled'].includes(wo.status)).length}
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-6">
                <h3 className="text-sm font-medium text-gray-500">Gas Orders (30d)</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">{gasOrders.length}</p>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'work-orders' && (
          <div className="space-y-4">
            {workOrders.length === 0 ? (
              <Card>
                <div className="p-8 text-center">
                  <p className="text-gray-500">No work orders yet</p>
                  <Button onClick={() => setShowWorkOrderModal(true)} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Work Order
                  </Button>
                </div>
              </Card>
            ) : (
              workOrders.map((wo) => (
                <Card key={wo.id}>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{wo.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{wo.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={wo.priority === 'critical' ? 'danger' : wo.priority === 'high' ? 'warning' : 'default'}>
                            {wo.priority}
                          </Badge>
                          <Badge variant="default">{wo.category}</Badge>
                        </div>
                      </div>
                      <div>{getStatusBadge(wo.status)}</div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'gas' && (
          <div className="space-y-4">
            {gasOrders.length === 0 ? (
              <Card>
                <div className="p-8 text-center">
                  <p className="text-gray-500">No gas orders yet</p>
                  <Button onClick={() => setShowGasOrderModal(true)} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Order Gas
                  </Button>
                </div>
              </Card>
            ) : (
              gasOrders.map((order) => (
                <Card key={order.id}>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">Order #{order.id.slice(0, 8)}</h3>
                        <p className="text-sm text-gray-600">Total: ${order.total.toFixed(2)}</p>
                      </div>
                      <div>{getStatusBadge(order.status)}</div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'units' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.map((unit) => (
              <Card key={unit.id}>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900">Unit {unit.unit_number}</h3>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    {unit.bedrooms && <p>{unit.bedrooms} bed · {unit.bathrooms} bath</p>}
                    {unit.sqft && <p>{unit.sqft} sqft</p>}
                    <Badge variant={unit.status === 'occupied' ? 'success' : 'default'}>
                      {unit.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'visitor-passes' && (
          <Card>
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">Generate visitor passes for guests</p>
              <Button onClick={() => setShowVisitorPassModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Visitor Pass
              </Button>
            </div>
          </Card>
        )}

        {activeTab === 'leases' && (
          <Card>
            <div className="p-8 text-center">
              <p className="text-gray-500">Lease management coming soon</p>
            </div>
          </Card>
        )}
      </div>

      {showWorkOrderModal && (
        <WorkOrderCreateModal
          propertyId={propertyId}
          units={units}
          onClose={() => setShowWorkOrderModal(false)}
          onSuccess={() => {
            setShowWorkOrderModal(false);
            loadPropertyData();
          }}
        />
      )}

      {showGasOrderModal && (
        <GasOrderModal
          propertyId={propertyId}
          units={units}
          onClose={() => setShowGasOrderModal(false)}
          onSuccess={() => {
            setShowGasOrderModal(false);
            loadPropertyData();
          }}
        />
      )}

      {showVisitorPassModal && (
        <VisitorPassModal
          propertyId={propertyId}
          units={units}
          onClose={() => setShowVisitorPassModal(false)}
          onSuccess={() => {
            setShowVisitorPassModal(false);
          }}
        />
      )}
    </div>
  );
}
