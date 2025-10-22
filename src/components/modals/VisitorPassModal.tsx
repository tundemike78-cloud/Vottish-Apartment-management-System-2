import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase, type Unit } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface VisitorPassModalProps {
  propertyId: string;
  units: Unit[];
  onClose: () => void;
  onSuccess: () => void;
}

export function VisitorPassModal({ propertyId, units, onClose, onSuccess }: VisitorPassModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    unitId: '',
    startsAt: '',
    endsAt: '',
    maxUses: 1,
    purpose: '',
    notes: '',
  });

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('visitor_passes').insert({
        property_id: propertyId,
        unit_id: formData.unitId || null,
        code: generateCode(),
        starts_at: formData.startsAt,
        ends_at: formData.endsAt,
        max_uses: formData.maxUses,
        used_count: 0,
        purpose: formData.purpose || null,
        notes: formData.notes || null,
        status: 'active',
        created_by: user.id,
      });

      if (insertError) throw insertError;

      onSuccess();
    } catch (err: any) {
      console.error('Error creating visitor pass:', err);
      setError(err.message || 'Failed to create visitor pass');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Create Visitor Pass</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit (Optional)
            </label>
            <select
              value={formData.unitId}
              onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Unit --</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  Unit {unit.unit_number}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date & Time"
              type="datetime-local"
              value={formData.startsAt}
              onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
              required
            />

            <Input
              label="End Date & Time"
              type="datetime-local"
              value={formData.endsAt}
              onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
              required
            />
          </div>

          <Input
            label="Maximum Uses"
            type="number"
            min="1"
            value={formData.maxUses}
            onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) })}
            required
          />

          <Input
            label="Purpose (Optional)"
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            placeholder="Delivery, Guest visit, etc."
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              A unique access code will be generated automatically when you create this pass.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" isLoading={loading}>
              Create Pass
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
