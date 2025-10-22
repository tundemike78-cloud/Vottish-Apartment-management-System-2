import { useEffect, useState } from 'react';
import { Users, Plus, Star, MapPin, Briefcase, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Vendor } from '../../lib/supabase';

type VendorWithUser = Vendor & {
  user?: {
    name: string;
    email: string;
    phone?: string;
  };
};

export function VendorsPage() {
  const { currentOrg, orgMember } = useOrg();
  const { user } = useAuth();
  const [vendors, setVendors] = useState<VendorWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorWithUser | null>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    trades: '',
    service_radius_km: 50,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      loadVendors();
    }
  }, [currentOrg]);

  const loadVendors = async () => {
    if (!currentOrg) return;

    try {
      const { data, error } = await supabase
        .from('vendors')
        .select(`
          *,
          user:users(name, email, phone)
        `)
        .or(`org_id.eq.${currentOrg.id},org_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVendors((data as any) || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentOrg) return;

    setSaving(true);
    try {
      const tradesArray = formData.trades
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const { error } = await supabase
        .from('vendors')
        .insert({
          user_id: user.id,
          org_id: currentOrg.id,
          company_name: formData.company_name,
          trades: tradesArray,
          service_radius_km: formData.service_radius_km,
          verified: false,
          rating: 0,
          total_jobs: 0,
        });

      if (error) throw error;

      setShowModal(false);
      setFormData({
        company_name: '',
        trades: '',
        service_radius_km: 50,
      });
      await loadVendors();
    } catch (error) {
      console.error('Error creating vendor:', error);
      alert('Failed to create vendor profile');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (vendorId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ verified })
        .eq('id', vendorId);

      if (error) throw error;

      await loadVendors();
    } catch (error) {
      console.error('Error updating vendor:', error);
      alert('Failed to update vendor verification');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const canManageVendors = orgMember?.role === 'owner' || orgMember?.role === 'staff';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Vendors</h1>
            <p className="text-lg text-gray-600">Manage service providers and contractors</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </Button>
        </div>

        {vendors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No vendors yet</h3>
              <p className="text-gray-600 mb-6">Add vendors to help with property maintenance</p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((vendor) => (
              <Card
                key={vendor.id}
                className="cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
                onClick={() => setSelectedVendor(vendor)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-xl mb-1">
                        {vendor.company_name}
                      </h3>
                      {vendor.user && (
                        <p className="text-sm text-gray-600">{vendor.user.name}</p>
                      )}
                    </div>
                    {vendor.verified ? (
                      <Badge variant="success" className="flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="warning">Unverified</Badge>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Briefcase className="h-4 w-4 mr-2" />
                      <span className="truncate">
                        {vendor.trades.join(', ') || 'No trades listed'}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{vendor.service_radius_km} km service radius</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Star className="h-4 w-4 mr-2 fill-yellow-400 text-yellow-400" />
                      <span>
                        {vendor.rating.toFixed(1)} ({vendor.total_jobs} jobs)
                      </span>
                    </div>
                  </div>

                  {vendor.user && (
                    <div className="pt-4 border-t border-gray-200 space-y-1">
                      <p className="text-xs text-gray-600">{vendor.user.email}</p>
                      {vendor.user.phone && (
                        <p className="text-xs text-gray-600">{vendor.user.phone}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Vendor"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Company Name"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            placeholder="ABC Plumbing Services"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trades / Services
            </label>
            <Input
              value={formData.trades}
              onChange={(e) => setFormData({ ...formData, trades: e.target.value })}
              placeholder="Plumbing, Electrical, HVAC (comma-separated)"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter trades separated by commas
            </p>
          </div>

          <Input
            type="number"
            label="Service Radius (km)"
            value={formData.service_radius_km}
            onChange={(e) => setFormData({ ...formData, service_radius_km: parseInt(e.target.value) || 50 })}
            min="1"
            required
          />

          <div className="flex space-x-3 pt-4">
            <Button type="submit" isLoading={saving} className="flex-1">
              Add Vendor
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

      <Modal
        isOpen={!!selectedVendor}
        onClose={() => setSelectedVendor(null)}
        title="Vendor Details"
      >
        {selectedVendor && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {selectedVendor.company_name}
              </h3>
              {selectedVendor.verified ? (
                <Badge variant="success" className="flex items-center w-fit">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="warning">Unverified</Badge>
              )}
            </div>

            {selectedVendor.user && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Contact Information</h4>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Name:</span> {selectedVendor.user.name}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Email:</span> {selectedVendor.user.email}
                </p>
                {selectedVendor.user.phone && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Phone:</span> {selectedVendor.user.phone}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Service Details</h4>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Trades:</span>{' '}
                {selectedVendor.trades.join(', ')}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Service Radius:</span>{' '}
                {selectedVendor.service_radius_km} km
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Performance</h4>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Rating:</span>{' '}
                {selectedVendor.rating.toFixed(1)} / 5.0
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Total Jobs:</span> {selectedVendor.total_jobs}
              </p>
            </div>

            {canManageVendors && (
              <div className="pt-4 border-t border-gray-200 flex space-x-3">
                {!selectedVendor.verified ? (
                  <Button
                    onClick={() => {
                      handleVerify(selectedVendor.id, true);
                      setSelectedVendor(null);
                    }}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify Vendor
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      handleVerify(selectedVendor.id, false);
                      setSelectedVendor(null);
                    }}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Unverify Vendor
                  </Button>
                )}
              </div>
            )}

            <Button
              variant="secondary"
              onClick={() => setSelectedVendor(null)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
