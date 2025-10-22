import { useState, useEffect } from 'react';
import { Search, Plus, Filter } from 'lucide-react';
import { supabase, type Property } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { PropertyCard } from './PropertyCard';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface PropertyWithStats extends Property {
  stats?: {
    openWorkOrders: number;
    slaAtRisk: number;
    visitorsToday: number;
    gasOrdersThisMonth: number;
    totalUnits: number;
    occupiedUnits: number;
  };
}

interface PropertyGalleryGridProps {
  onPropertyClick?: (propertyId: string) => void;
}

export function PropertyGalleryGrid({ onPropertyClick }: PropertyGalleryGridProps) {
  const { currentOrg } = useOrg();
  const [properties, setProperties] = useState<PropertyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'newest' | 'workorders'>('name');

  useEffect(() => {
    if (currentOrg) {
      loadProperties();
    }
  }, [currentOrg]);

  const loadProperties = async () => {
    if (!currentOrg) return;

    try {
      setLoading(true);

      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('org_id', currentOrg.id)
        .order('name');

      if (propertiesError) throw propertiesError;

      const propertiesWithStats = await Promise.all(
        (propertiesData || []).map(async (property) => {
          const [workOrders, units, visitors, gasOrders] = await Promise.all([
            supabase
              .from('work_orders')
              .select('id, status, sla_due_at')
              .eq('property_id', property.id)
              .in('status', ['new', 'triaged', 'assigned', 'in_progress']),
            supabase
              .from('units')
              .select('id, status')
              .eq('property_id', property.id),
            supabase
              .from('visitor_events')
              .select('id')
              .eq('property_id', property.id)
              .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
            supabase
              .from('orders')
              .select('id')
              .eq('property_id', property.id)
              .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
          ]);

          const now = new Date();
          const slaAtRisk = (workOrders.data || []).filter(wo =>
            wo.sla_due_at && new Date(wo.sla_due_at) < now
          ).length;

          const occupiedUnits = (units.data || []).filter(u => u.status === 'occupied').length;

          return {
            ...property,
            stats: {
              openWorkOrders: workOrders.data?.length || 0,
              slaAtRisk,
              visitorsToday: visitors.data?.length || 0,
              gasOrdersThisMonth: gasOrders.data?.length || 0,
              totalUnits: units.data?.length || 0,
              occupiedUnits,
            },
          };
        })
      );

      setProperties(propertiesWithStats);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties
    .filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'workorders') {
        return (b.stats?.openWorkOrders || 0) - (a.stats?.openWorkOrders || 0);
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <Filter className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Properties Yet</h3>
        <p className="text-gray-600 mb-6">
          Get started by adding your first property to manage.
        </p>
        <Button onClick={() => alert('Add property feature coming soon')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="newest">Sort by Newest</option>
            <option value="workorders">Sort by Work Orders</option>
          </select>

          <Button onClick={() => alert('Add property feature coming soon')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            stats={property.stats}
            onClick={() => onPropertyClick?.(property.id)}
          />
        ))}
      </div>
    </div>
  );
}
