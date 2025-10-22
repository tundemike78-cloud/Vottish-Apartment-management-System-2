import { useEffect, useState } from 'react';
import { ShoppingCart, Plus, Minus, Store, Package, Clock, TrendingUp } from 'lucide-react';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Product, Order, Property, VendorProduct, Vendor } from '../../lib/supabase';

type CartItem = {
  vendorProduct: VendorProductWithDetails;
  quantity: number;
};

type VendorProductWithDetails = VendorProduct & {
  product: Product;
  vendor: Vendor;
};

export function GasStoreModernPage() {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const [vendorProducts, setVendorProducts] = useState<VendorProductWithDetails[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState('');

  useEffect(() => {
    loadData();
  }, [currentOrg]);

  const loadData = async () => {
    if (!currentOrg || !user) return;

    try {
      const [vendorProductsRes, ordersRes, propsRes] = await Promise.all([
        supabase
          .from('vendor_products')
          .select(`
            *,
            product:products(*),
            vendor:vendors(*)
          `)
          .eq('available', true)
          .gt('stock_quantity', 0),
        supabase
          .from('orders')
          .select('*')
          .eq('org_id', currentOrg.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('properties')
          .select('*')
          .eq('org_id', currentOrg.id)
      ]);

      if (vendorProductsRes.error) throw vendorProductsRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (propsRes.error) throw propsRes.error;

      setVendorProducts((vendorProductsRes.data as any) || []);
      setOrders(ordersRes.data || []);
      setProperties(propsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (vendorProduct: VendorProductWithDetails) => {
    setCart(prev => {
      const existing = prev.find(item => item.vendorProduct.id === vendorProduct.id);
      if (existing) {
        if (existing.quantity >= vendorProduct.stock_quantity) return prev;
        return prev.map(item =>
          item.vendorProduct.id === vendorProduct.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { vendorProduct, quantity: 1 }];
    });
  };

  const removeFromCart = (vendorProductId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.vendorProduct.id === vendorProductId);
      if (existing && existing.quantity > 1) {
        return prev.map(item =>
          item.vendorProduct.id === vendorProductId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter(item => item.vendorProduct.id !== vendorProductId);
    });
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.vendorProduct.price * item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (!currentOrg || !user || !selectedProperty) {
      alert('Please select a delivery property');
      return;
    }

    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    try {
      const items = cart.map(item => ({
        vendor_product_id: item.vendorProduct.id,
        product_id: item.vendorProduct.product_id,
        name: item.vendorProduct.product.name,
        quantity: item.quantity,
        price: item.vendorProduct.price,
        vendor: item.vendorProduct.vendor.company_name,
      }));

      const total = calculateTotal();

      const { error } = await supabase
        .from('orders')
        .insert({
          org_id: currentOrg.id,
          property_id: selectedProperty,
          user_id: user.id,
          total,
          status: 'pending',
          items,
        });

      if (error) throw error;

      alert('Order placed successfully!');
      setCart([]);
      setSelectedProperty('');
      await loadData();
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800',
      confirmed: 'bg-blue-100 text-blue-800',
      out_for_delivery: 'bg-violet-100 text-violet-800',
      delivered: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-rose-100 text-rose-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Gas Store</h1>
          <p className="text-lg text-gray-600">Order cooking gas cylinders from verified vendors</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <Store className="h-5 w-5 mr-2" />
                  Available Products
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vendorProducts.map((vp) => (
                    <div
                      key={vp.id}
                      className="group bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg mb-1">{vp.product.name}</h3>
                          {vp.product.size && (
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                              {vp.product.size}
                            </span>
                          )}
                        </div>
                        <Package className="h-5 w-5 text-gray-400" />
                      </div>

                      {vp.product.description && (
                        <p className="text-sm text-gray-600 mb-3">{vp.product.description}</p>
                      )}

                      <div className="bg-blue-50 rounded-lg p-3 mb-3 space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 flex items-center">
                            <Store className="h-3 w-3 mr-1" />
                            Vendor
                          </span>
                          <span className="font-medium text-gray-900">{vp.vendor.company_name}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Delivery
                          </span>
                          <span className="font-medium text-gray-900">{vp.delivery_time_hours}h</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 flex items-center">
                            <Package className="h-3 w-3 mr-1" />
                            In Stock
                          </span>
                          <span className="font-medium text-gray-900">{vp.stock_quantity}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <span className="text-2xl font-bold text-gray-900">
                          ${vp.price.toFixed(2)}
                        </span>
                        <button
                          onClick={() => addToCart(vp)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center shadow-sm hover:shadow-md"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {vendorProducts.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No products available</p>
                    <p className="text-gray-400 text-sm mt-2">Check back later for new inventory</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Recent Orders
                </h2>
              </div>
              <div className="p-6">
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No orders yet</p>
                    <p className="text-gray-400 text-sm mt-2">Your order history will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-bold text-gray-900 text-lg">${order.total.toFixed(2)}</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden sticky top-24">
              <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Your Cart
                </h2>
              </div>
              <div className="p-6">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg font-medium">Cart is empty</p>
                    <p className="text-gray-400 text-sm mt-2">Add items to get started</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {cart.map((item) => (
                        <div key={item.vendorProduct.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{item.vendorProduct.product.name}</p>
                              <p className="text-xs text-gray-600 mt-1">{item.vendorProduct.vendor.company_name}</p>
                              <p className="text-sm font-medium text-gray-700 mt-1">
                                ${item.vendorProduct.price.toFixed(2)} each
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 bg-white border border-gray-300 rounded-lg px-2 py-1">
                              <button
                                onClick={() => removeFromCart(item.vendorProduct.id)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                              >
                                <Minus className="h-4 w-4 text-gray-600" />
                              </button>
                              <span className="font-semibold text-gray-900 w-8 text-center">{item.quantity}</span>
                              <button
                                onClick={() => addToCart(item.vendorProduct)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                disabled={item.quantity >= item.vendorProduct.stock_quantity}
                              >
                                <Plus className="h-4 w-4 text-gray-600" />
                              </button>
                            </div>
                            <span className="font-bold text-gray-900">
                              ${(item.vendorProduct.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-violet-50 rounded-xl p-4 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-700">Total:</span>
                        <span className="text-2xl font-bold text-gray-900">${calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Delivery Property
                      </label>
                      <select
                        value={selectedProperty}
                        onChange={(e) => setSelectedProperty(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      >
                        <option value="">Select property</option>
                        {properties.map((prop) => (
                          <option key={prop.id} value={prop.id}>
                            {prop.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleCheckout}
                      disabled={!selectedProperty}
                      className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-violet-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Place Order
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
