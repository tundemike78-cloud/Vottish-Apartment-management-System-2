import { useEffect, useState } from 'react';
import { Plus, Package, Edit2, Trash2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Product, VendorProduct, Vendor } from '../../lib/supabase';

type VendorProductWithProduct = VendorProduct & {
  product: Product;
};

export function VendorInventoryPage() {
  const { user } = useAuth();
  const [myVendor, setMyVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendorProducts, setVendorProducts] = useState<VendorProductWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<VendorProductWithProduct | null>(null);
  const [formData, setFormData] = useState({
    product_id: '',
    price: 0,
    stock_quantity: 0,
    delivery_time_hours: 24,
    available: true,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (vendorError) throw vendorError;

      setMyVendor(vendorData);

      if (vendorData) {
        const [productsRes, vendorProductsRes] = await Promise.all([
          supabase
            .from('products')
            .select('*')
            .eq('active', true)
            .eq('is_gas_cylinder', true),
          supabase
            .from('vendor_products')
            .select('*, product:products(*)')
            .eq('vendor_id', vendorData.id)
        ]);

        if (productsRes.error) throw productsRes.error;
        if (vendorProductsRes.error) throw vendorProductsRes.error;

        setProducts(productsRes.data || []);
        setVendorProducts((vendorProductsRes.data as any) || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myVendor) return;

    setSaving(true);
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('vendor_products')
          .update({
            price: formData.price,
            stock_quantity: formData.stock_quantity,
            delivery_time_hours: formData.delivery_time_hours,
            available: formData.available,
            notes: formData.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendor_products')
          .insert({
            vendor_id: myVendor.id,
            ...formData,
          });

        if (error) throw error;
      }

      setShowModal(false);
      setEditingProduct(null);
      setFormData({
        product_id: '',
        price: 0,
        stock_quantity: 0,
        delivery_time_hours: 24,
        available: true,
        notes: '',
      });
      await loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (vp: VendorProductWithProduct) => {
    setEditingProduct(vp);
    setFormData({
      product_id: vp.product_id,
      price: vp.price,
      stock_quantity: vp.stock_quantity,
      delivery_time_hours: vp.delivery_time_hours,
      available: vp.available,
      notes: vp.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this product from your inventory?')) return;

    try {
      const { error } = await supabase
        .from('vendor_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!myVendor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor Profile Required</h2>
          <p className="text-gray-600">You need to create a vendor profile first to manage your inventory.</p>
        </div>
      </div>
    );
  }

  const availableProducts = products.filter(
    p => !vendorProducts.some(vp => vp.product_id === p.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">My Inventory</h1>
            <p className="text-lg text-gray-600">Manage your gas cylinder products</p>
          </div>
          <button
            onClick={() => {
              setEditingProduct(null);
              setFormData({
                product_id: '',
                price: 0,
                stock_quantity: 0,
                delivery_time_hours: 24,
                available: true,
                notes: '',
              });
              setShowModal(true);
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-violet-700 transition-all duration-200 flex items-center shadow-lg hover:shadow-xl"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Product
          </button>
        </div>

        {vendorProducts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Package className="h-20 w-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No products yet</h3>
            <p className="text-gray-600 mb-6">Add products to start selling gas cylinders</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-violet-700 transition-all duration-200 inline-flex items-center shadow-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendorProducts.map((vp) => (
              <div
                key={vp.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-200"
              >
                <div className={`h-2 ${vp.available ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-gray-400 to-gray-500'}`} />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-xl mb-1">{vp.product.name}</h3>
                      {vp.product.size && (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          {vp.product.size}
                        </span>
                      )}
                    </div>
                    {vp.available && vp.stock_quantity > 0 ? (
                      <span className="flex items-center text-emerald-600 text-sm font-semibold">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm font-semibold">Inactive</span>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Price</span>
                      <span className="font-bold text-gray-900">${vp.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Stock</span>
                      <span className={`font-semibold ${vp.stock_quantity > 10 ? 'text-emerald-600' : vp.stock_quantity > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {vp.stock_quantity} units
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Delivery Time</span>
                      <span className="font-semibold text-gray-900">{vp.delivery_time_hours}h</span>
                    </div>
                  </div>

                  {vp.notes && (
                    <p className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg">
                      {vp.notes}
                    </p>
                  )}

                  <div className="flex space-x-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleEdit(vp)}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-50 to-violet-50 text-blue-700 rounded-lg font-medium hover:from-blue-100 hover:to-violet-100 transition-all duration-200 flex items-center justify-center"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(vp.id)}
                      className="flex-1 px-4 py-2 bg-rose-50 text-rose-700 rounded-lg font-medium hover:bg-rose-100 transition-all duration-200 flex items-center justify-center"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-4">
              <h2 className="text-2xl font-bold text-white">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Product
                </label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                  disabled={!!editingProduct}
                >
                  <option value="">Select a product</option>
                  {editingProduct ? (
                    <option value={editingProduct.product_id}>
                      {editingProduct.product.name}
                    </option>
                  ) : (
                    availableProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} {product.size ? `(${product.size})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Delivery Time (hours)
                </label>
                <input
                  type="number"
                  value={formData.delivery_time_hours}
                  onChange={(e) => setFormData({ ...formData, delivery_time_hours: parseInt(e.target.value) || 24 })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">Available for purchase</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  rows={3}
                  placeholder="Any additional information..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-violet-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                >
                  {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                  }}
                  className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
