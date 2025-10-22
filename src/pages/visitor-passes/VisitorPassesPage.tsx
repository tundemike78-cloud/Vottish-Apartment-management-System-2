import { useEffect, useState } from 'react';
import { Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, VisitorPass, Property } from '../../lib/supabase';

export function VisitorPassesPage() {
  const { currentOrg, orgMember } = useOrg();
  const { user } = useAuth();
  const [passes, setPasses] = useState<VisitorPass[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [validateCode, setValidateCode] = useState('');
  const [formData, setFormData] = useState({
    property_id: '',
    purpose: '',
    notes: '',
    starts_at: '',
    ends_at: '',
    max_uses: 1,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      loadData();
    }
  }, [currentOrg]);

  const loadData = async () => {
    if (!currentOrg) return;

    try {
      const [passesResponse, propsResponse] = await Promise.all([
        supabase
          .from('visitor_passes')
          .select('*')
          .in('property_id', await getPropertyIds())
          .order('created_at', { ascending: false }),
        supabase
          .from('properties')
          .select('*')
          .eq('org_id', currentOrg.id)
      ]);

      if (passesResponse.error) throw passesResponse.error;
      if (propsResponse.error) throw propsResponse.error;

      setPasses(passesResponse.data || []);
      setProperties(propsResponse.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPropertyIds = async () => {
    if (!currentOrg) return [];
    const { data } = await supabase
      .from('properties')
      .select('id')
      .eq('org_id', currentOrg.id);
    return data?.map(p => p.id) || [];
  };

  const generateCode = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const code = generateCode();

      const { error } = await supabase
        .from('visitor_passes')
        .insert({
          ...formData,
          code,
          created_by: user.id,
          status: 'active',
        });

      if (error) throw error;

      setShowModal(false);
      setFormData({
        property_id: '',
        purpose: '',
        notes: '',
        starts_at: '',
        ends_at: '',
        max_uses: 1,
      });
      await loadData();
    } catch (error) {
      console.error('Error creating pass:', error);
      alert('Failed to create visitor pass');
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!validateCode || !user) return;

    try {
      const { data: pass, error: fetchError } = await supabase
        .from('visitor_passes')
        .select('*')
        .eq('code', validateCode)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let result = 'invalid';
      let canUse = false;

      if (pass) {
        const now = new Date();
        const starts = new Date(pass.starts_at);
        const ends = new Date(pass.ends_at);

        if (pass.status === 'revoked') {
          result = 'invalid';
        } else if (now < starts || now > ends) {
          result = 'outside_time_window';
        } else if (pass.used_count >= pass.max_uses) {
          result = 'max_uses_exceeded';
        } else {
          result = 'success';
          canUse = true;
        }

        await supabase.from('visitor_events').insert({
          visitor_pass_id: pass.id,
          validated_by: user.id,
          result,
        });

        if (canUse) {
          await supabase
            .from('visitor_passes')
            .update({
              used_count: pass.used_count + 1,
              status: pass.used_count + 1 >= pass.max_uses ? 'used' : 'active',
            })
            .eq('id', pass.id);
        }
      }

      alert(
        result === 'success'
          ? 'Access granted!'
          : `Access denied: ${result.replace('_', ' ')}`
      );

      setValidateCode('');
      setShowValidateModal(false);
      await loadData();
    } catch (error) {
      console.error('Error validating pass:', error);
      alert('Validation failed');
    }
  };

  const getStatusBadge = (pass: VisitorPass) => {
    const now = new Date();
    const ends = new Date(pass.ends_at);

    if (pass.status === 'revoked') return <Badge variant="danger">Revoked</Badge>;
    if (pass.status === 'used') return <Badge variant="default">Used</Badge>;
    if (now > ends) return <Badge variant="warning">Expired</Badge>;
    if (pass.used_count >= pass.max_uses) return <Badge variant="default">Max Uses Reached</Badge>;

    return <Badge variant="success">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isSecurity = orgMember?.role === 'security';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Visitor Passes</h1>
          <p className="text-gray-600 mt-1">Manage visitor access codes</p>
        </div>
        <div className="flex space-x-3">
          {isSecurity && (
            <Button variant="secondary" onClick={() => setShowValidateModal(true)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Validate Code
            </Button>
          )}
          {!isSecurity && (
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Pass
            </Button>
          )}
        </div>
      </div>

      {passes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No visitor passes yet</h3>
            <p className="text-gray-600 mb-4">Generate passes for your visitors</p>
            {!isSecurity && (
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Pass
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {passes.map((pass) => {
            const property = properties.find(p => p.id === pass.property_id);

            return (
              <Card key={pass.id}>
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold text-blue-600 mb-2">{pass.code}</div>
                    {getStatusBadge(pass)}
                  </div>

                  {property && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Property:</span> {property.name}
                    </p>
                  )}

                  {pass.purpose && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Purpose:</span> {pass.purpose}
                    </p>
                  )}

                  <div className="text-sm text-gray-600 space-y-1 mt-4 pt-4 border-t border-gray-200">
                    <p>
                      <span className="font-medium">Valid from:</span>{' '}
                      {new Date(pass.starts_at).toLocaleString()}
                    </p>
                    <p>
                      <span className="font-medium">Valid until:</span>{' '}
                      {new Date(pass.ends_at).toLocaleString()}
                    </p>
                    <p>
                      <span className="font-medium">Uses:</span> {pass.used_count} / {pass.max_uses}
                    </p>
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
        title="Generate Visitor Pass"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <Input
            label="Purpose"
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            placeholder="Delivery, guest visit, etc."
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="Additional information..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="datetime-local"
              label="Starts At"
              value={formData.starts_at}
              onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
              required
            />

            <Input
              type="datetime-local"
              label="Ends At"
              value={formData.ends_at}
              onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
              required
            />
          </div>

          <Input
            type="number"
            label="Max Uses"
            value={formData.max_uses}
            onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) || 1 })}
            min="1"
            required
          />

          <div className="flex space-x-3 pt-4">
            <Button type="submit" isLoading={saving} className="flex-1">
              Generate Pass
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
        isOpen={showValidateModal}
        onClose={() => setShowValidateModal(false)}
        title="Validate Visitor Code"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Enter Code"
            value={validateCode}
            onChange={(e) => setValidateCode(e.target.value)}
            placeholder="4-digit code"
            maxLength={4}
            className="text-center text-2xl"
          />

          <div className="flex space-x-3">
            <Button onClick={handleValidate} className="flex-1">
              <CheckCircle className="h-4 w-4 mr-2" />
              Validate
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setValidateCode('');
                setShowValidateModal(false);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
