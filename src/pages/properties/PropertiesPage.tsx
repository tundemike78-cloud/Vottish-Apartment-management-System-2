import { useEffect, useState } from 'react';
import { Plus, Building, MapPin } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useOrg } from '../../contexts/OrgContext';
import { supabase, Property } from '../../lib/supabase';

export function PropertiesPage() {
  const { currentOrg } = useOrg();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'apartment' as const,
    address: '',
    units_count: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      loadProperties();
    }
  }, [currentOrg]);

  const loadProperties = async () => {
    if (!currentOrg) return;

    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('properties')
        .insert({
          org_id: currentOrg.id,
          ...formData,
        });

      if (error) throw error;

      setShowModal(false);
      setFormData({ name: '', type: 'apartment', address: '', units_count: 0 });
      await loadProperties();
    } catch (error) {
      console.error('Error creating property:', error);
      alert('Failed to create property');
    } finally {
      setSaving(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-600 mt-1">Manage your buildings and estates</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No properties yet</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first property</p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Card key={property.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                  <Badge>{property.type}</Badge>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">{property.name}</h3>

                <div className="flex items-start text-sm text-gray-600 mb-4">
                  <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                  <span>{property.address}</span>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{property.units_count}</span> units
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add New Property"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Property Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Sunset Apartments"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="apartment">Apartment</option>
              <option value="estate">Estate</option>
              <option value="subdivision">Subdivision</option>
              <option value="complex">Complex</option>
            </select>
          </div>

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="123 Main St, New York, NY 10001"
            required
          />

          <Input
            type="number"
            label="Number of Units"
            value={formData.units_count}
            onChange={(e) => setFormData({ ...formData, units_count: parseInt(e.target.value) || 0 })}
            placeholder="0"
            min="0"
            required
          />

          <div className="flex space-x-3 pt-4">
            <Button type="submit" isLoading={saving} className="flex-1">
              Create Property
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
