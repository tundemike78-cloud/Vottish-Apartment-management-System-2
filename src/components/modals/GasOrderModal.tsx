import { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { supabase, type Unit, type Product } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface GasOrderModalProps {
  propertyId: string;
  units: Unit[];
  onClose: () => void;
  onSuccess: () => void;
}

export function GasOrderModal({ propertyId, units, onClose, onSuccess }: GasOrderModalProps) {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedUnit, setSelectedUnit] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .eq('is_gas_cylinder', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError('Failed to load products');
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const updated = Math.max(0, current + delta);
      if (updated === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: updated };
    });
  };

  const calculateTotal = () => {
    return Object.entries(cart).reduce((sum, [productId, quantity]) => {
      const product = products.find((p) => p.id === productId);
      return sum + (product?.price || 0) * quantity;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !user) return;

    if (Object.keys(cart).length === 0) {
      setError('Please add at least one item to your order');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const items = Object.entries(cart).map(([productId, quantity]) => {
        const product = products.find((p) => p.id === productId);
        return {
          product_id: productId,
          product_name: product?.name,
          quantity,
          price: product?.price,
        };
      });

      const { error: insertError } = await supabase.from('orders').insert({
        org_id: currentOrg.id,
        property_id: propertyId,
        unit_id: selectedUnit || null,
        user_id: user.id,
        total: calculateTotal(),
        status: 'pending',
        items,
      });

      if (insertError) throw insertError;

      onSuccess();
    } catch (err: any) {
      console.error('Error creating order:', err);
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Order Gas Cylinders</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Unit (Optional)
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
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

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Available Products</h3>
            <div className="space-y-3">
              {products.map((product) => (
                <Card key={product.id}>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{product.name}</h4>
                      {product.size && (
                        <p className="text-sm text-gray-600">Size: {product.size}</p>
                      )}
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        ${product.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, -1)}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                        disabled={!cart[product.id]}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-medium">
                        {cart[product.id] || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, 1)}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {Object.keys(cart).length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-gray-900">
                  ${calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" isLoading={loading}>
              Place Order
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
