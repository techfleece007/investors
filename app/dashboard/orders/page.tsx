'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, ShoppingCart, Calendar, DollarSign, X, CheckCircle, Trash2, Edit } from 'lucide-react'
import { calculatePaymentFees } from '@/lib/utils/paymentFees'

interface Order {
  id: string
  order_number: number
  shipping_number: number
  product_name: string
  sizes: string
  quantity: number
  total_price: number
  payment_method: string
  payment_fees: number
  delivery_fees: number
  status: string
  created_at: string
}

interface Product {
  id: string
  name: string
  cost_per_piece: number
  price_per_piece: number
  quantity: number
  image_url: string
}

interface ProductVariant {
  id: string
  product_id: string
  size: string
  quantity: number
  price: number
  cost: number
}

interface OrderItem {
  product_id: string
  product_name: string
  size: string
  quantity: number
  price_per_piece: number
  total_price: number
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [formData, setFormData] = useState({
    order_number: '',
    shipping_number: '',
    payment_method: 'cash' as 'cash' | 'card' | 'tabby',
    payment_fees: 0,
    delivery_fees: 20,
    status: 'pending' as 'pending' | 'completed' | 'canceled'
  })
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch orders with product details
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          products (
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Group orders by order_number to show multi-product orders properly
      const orderGroups = ordersData.reduce((groups: any, order) => {
        const orderNumber = order.order_number
        if (!groups[orderNumber]) {
          groups[orderNumber] = {
            order_number: orderNumber,
            shipping_number: order.shipping_number,
            payment_method: order.payment_method,
            status: order.status,
            created_at: order.created_at,
            products: []
          }
        }
        groups[orderNumber].products.push({
          id: order.id,
          product_name: (order.products as any)?.name || 'Unknown Product',
          sizes: order.sizes || 'Unknown Sizes',
          quantity: order.quantity,
          total_price: order.total_price,
          payment_fees: order.payment_fees,
          delivery_fees: order.delivery_fees
        })
        return groups
      }, {})

      // Transform grouped orders back to flat structure for display, sorted by most recent created_at
      const transformedOrders = Object.values(orderGroups)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((group: any) => {
        const totalOrderValue = group.products.reduce((sum: number, product: any) => sum + product.total_price, 0)
        const productCount = group.products.length
        
        return {
          id: group.products[0].id, // Use first product ID as main ID
          order_number: group.order_number,
          shipping_number: group.shipping_number,
          product_name: productCount === 1 
            ? group.products[0].product_name 
            : `${productCount} Products (${group.products.map((p: any) => p.product_name).join(', ')})`,
          sizes: productCount === 1 
            ? group.products[0].sizes 
            : group.products.map((p: any) => `${p.product_name}: ${p.sizes}`).join('; '),
          quantity: group.products.reduce((sum: number, product: any) => sum + product.quantity, 0),
          total_price: totalOrderValue,
          payment_method: group.payment_method,
          payment_fees: group.products.reduce((sum: number, product: any) => sum + (product.payment_fees || 0), 0),
          delivery_fees: group.products.reduce((sum: number, product: any) => sum + (product.delivery_fees || 0), 0),
          status: group.status,
          created_at: group.created_at
        }
      })

      setOrders(transformedOrders)

      // Fetch ALL products (not just those with quantity > 0)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name')

      if (productsError) throw productsError
      setProducts(productsData || [])

      // Fetch ALL product variants (not just those with quantity > 0)
      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variants')
        .select('*')
        .order('product_id, size')

      if (variantsError) throw variantsError
      setProductVariants(variantsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addOrderItem = () => {
    setOrderItems(prev => [...prev, {
      product_id: '',
      product_name: '',
      size: '',
      quantity: 1,
      price_per_piece: 0,
      total_price: 0
    }])
  }

  const removeOrderItem = (index: number) => {
    setOrderItems(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // Recalculate payment fees when order items change
      recalculatePaymentFees(updated)
      return updated
    })
  }

  // Helper function to recalculate payment fees when order total changes
  const recalculatePaymentFees = (newOrderItems: OrderItem[]) => {
    const totalOrderAmount = newOrderItems.reduce((sum, item) => sum + item.total_price, 0)
    const calculatedFees = calculatePaymentFees(formData.payment_method, totalOrderAmount)
    setFormData(prev => ({ ...prev, payment_fees: calculatedFees }))
  }

  const updateOrderItem = (index: number, field: keyof OrderItem, value: string | number) => {
    setOrderItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      
      // Recalculate total price when quantity or price changes
      if (field === 'quantity' || field === 'price_per_piece') {
        updated[index].total_price = updated[index].quantity * updated[index].price_per_piece
      }
      
      // Recalculate payment fees when total order amount changes
      recalculatePaymentFees(updated)
      
      return updated
    })
  }

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find(p => p.id.toString() === productId)
    
    if (product) {
      setOrderItems(prev => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          product_id: productId,
          product_name: product.name,
          price_per_piece: product.price_per_piece,
          total_price: product.price_per_piece * updated[index].quantity,
          size: '' // Reset size when product changes
        }
        
        // Recalculate payment fees when total order amount changes
        recalculatePaymentFees(updated)
        
        return updated
      })
    }
  }

  const handleSizeChange = (index: number, size: string) => {
    const item = orderItems[index]
    
    if (item && item.product_id) {
      const variant = productVariants.find(v => 
        v.product_id.toString() === item.product_id && v.size === size
      )
      
      if (variant) {
        setOrderItems(prev => {
          const updated = [...prev]
          updated[index] = {
            ...updated[index],
            size: size,
            price_per_piece: variant.price,
            total_price: variant.price * updated[index].quantity
          }
          
          // Recalculate payment fees when total order amount changes
          recalculatePaymentFees(updated)
          
          return updated
        })
      }
    }
  }

  const getAvailableQuantity = (productId: string, size: string) => {
    const variant = productVariants.find(v => v.product_id.toString() === productId && v.size === size)
    return variant ? variant.quantity : 0
  }

  const getAvailableSizes = (productId: string) => {
    return productVariants.filter(v => v.product_id.toString() === productId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (orderItems.length === 0) {
      alert('Please add at least one product to the order')
      return
    }

    // Validate quantities don't exceed available stock
    for (const item of orderItems) {
      if (!item.product_id || !item.size) {
        alert('Please select both product and size for all items')
        return
      }
      
      const availableQty = getAvailableQuantity(item.product_id, item.size)
      if (item.quantity > availableQty) {
        alert(`Quantity ${item.quantity} exceeds available stock (${availableQty}) for ${item.product_name} - Size ${item.size}`)
        return
      }
    }

    try {
      // Generate order and shipping numbers if not provided
      const orderNumber = formData.order_number || Math.floor(Math.random() * 9000) + 1000
      const shippingNumber = formData.shipping_number || Math.floor(Math.random() * 900000) + 100000

      // Calculate total order amount (without fees - fees are only for profit calculation)
      const totalOrderAmount = orderItems.reduce((sum, item) => sum + item.total_price, 0)

      // Create separate order row for each product
      for (const item of orderItems) {
        const { error: orderError } = await supabase
          .from('orders')
          .insert({
            product_id: parseInt(item.product_id),
            order_number: orderNumber,
            shipping_number: shippingNumber,
            paid_amount: item.total_price, // Individual product total (not the full order total)
            total_price: item.total_price,
            quantity: item.quantity,
            sizes: item.size, // Single size per product row
            payment_method: formData.payment_method,
            payment_fees: formData.payment_fees / orderItems.length, // Distribute fees across products
            delivery_fees: formData.delivery_fees / orderItems.length, // Distribute fees across products
            status: formData.status
          })

        if (orderError) throw orderError

        // Note: Product quantity updates and profit calculations are handled automatically by SQL triggers
        // Each product gets its own row with its specific size and quantity
      }

      setShowSuccess(true)
      setShowAddModal(false)
      setOrderItems([])
      setFormData({
        order_number: '',
        shipping_number: '',
        payment_method: 'cash',
        payment_fees: 0,
        delivery_fees: 20,
        status: 'pending'
      })
      fetchData()
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Error creating order. Please try again.')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleEditOrder = async (order: Order) => {
    try {
      // Get all orders with the same order number
      const { data: orderData, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', order.order_number)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      if (!orderData || orderData.length === 0) {
        alert('Order not found')
        return
      }

      // Show edit modal with current order data
      const newStatus = prompt(
        `Edit Order #${order.order_number}\n\nCurrent Status: ${order.status}\n\nEnter new status (pending/completed/canceled):`,
        order.status
      )

      if (newStatus && newStatus !== order.status && ['pending', 'completed', 'canceled'].includes(newStatus)) {
        // Update all orders with the same order number
        const { error: updateError } = await supabase
          .from('orders')
          .update({ status: newStatus })
          .eq('order_number', order.order_number)

        if (updateError) throw updateError

        alert(`Order #${order.order_number} status updated to ${newStatus}`)
        fetchData() // Refresh the data
      } else if (newStatus && !['pending', 'completed', 'canceled'].includes(newStatus)) {
        alert('Invalid status. Please enter: pending, completed, or canceled')
      }
    } catch (error) {
      console.error('Error editing order:', error)
      alert('Error updating order. Please try again.')
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (confirm('Are you sure you want to delete this order? This will automatically restore product quantities and update profits.')) {
      try {
        // Delete the order - this will trigger the database to automatically update quantities and profits
        const { error } = await supabase
          .from('orders')
          .delete()
          .eq('id', orderId)

        if (error) throw error
        
        // Refresh the data
        fetchData()
        alert('Order deleted successfully! Product quantities and profits have been automatically updated.')
      } catch (error) {
        console.error('Error deleting order:', error)
        alert('Error deleting order. Please try again.')
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your product orders and inventory</p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true)
            // Automatically add one order item when opening the modal
            setOrderItems([{
              product_id: '',
              product_name: '',
              size: '',
              quantity: 1,
              price_per_piece: 0,
              total_price: 0
            }])
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </button>
      </div>

      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in slide-in-from-right-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span>Order created successfully! Each product saved as separate row.</span>
          </div>
        </div>
      )}

      {/* Orders Display */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {/* Mobile Card View */}
        <div className="block lg:hidden">
          {orders.map((order, index) => (
            <div key={order.id} className={`p-4 ${index < orders.length - 1 ? 'border-b-2 border-blue-200 dark:border-blue-800 mb-4' : ''}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">Order #{order.order_number}</h3>
                  <p className="text-sm text-muted-foreground">Shipping #{order.shipping_number}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  order.status === 'completed' ? 'bg-green-100 text-green-800' :
                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {order.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground mr-2" />
                  <span className="font-medium text-foreground">{order.product_name}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Size:</span>
                    <span className="ml-1 font-medium">{order.sizes}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quantity:</span>
                    <span className="ml-1 font-medium">{order.quantity}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Payment:</span>
                    <span className="ml-1 font-medium capitalize">{order.payment_method}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total:</span>
                    <span className="ml-1 font-medium text-green-600">AED {order.total_price.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Payment Fees:</span>
                    <span className="ml-1 font-medium">AED {order.payment_fees?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Delivery Fees:</span>
                    <span className="ml-1 font-medium">AED {order.delivery_fees?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditOrder(order)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Edit Order"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Delete Order"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Shipping #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Fees
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {orders.map((order, index) => (
                <tr key={order.id} className={`hover:bg-muted/30 ${index < orders.length - 1 ? 'border-b-2 border-blue-200 dark:border-blue-800' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    #{order.order_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    #{order.shipping_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground mr-2" />
                      <span className="text-sm font-medium text-foreground">
                        {order.product_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {order.sizes}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {order.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-muted-foreground mr-1" />
                      <span>AED {order.total_price.toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    <span className="capitalize">{order.payment_method}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <div className="space-y-1">
                      <div>P: AED {order.payment_fees?.toFixed(2) || '0.00'}</div>
                      <div>D: AED {order.delivery_fees?.toFixed(2) || '0.00'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                      {formatDate(order.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit Order"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete Order"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {orders.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No orders</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started by creating your first order.
            </p>
          </div>
        )}
      </div>

      {/* Add Order Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowAddModal(false)
            setOrderItems([])
            setFormData({
              order_number: '',
              shipping_number: '',
              payment_method: 'cash',
              payment_fees: 0,
              delivery_fees: 20,
              status: 'pending'
            })
          }}
        >
          <div 
            className="bg-card border border-border rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto mx-2 sm:mx-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">
                Create New Order
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setOrderItems([])
                  setFormData({
                    order_number: '',
                    shipping_number: '',
                    payment_method: 'cash',
                    payment_fees: 0,
                    delivery_fees: 20,
                    status: 'pending'
                  })
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Order Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Order Number
                    </label>
                    <input
                      type="text"
                      value={formData.order_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, order_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Shipping Number
                    </label>
                    <input
                      type="text"
                      value={formData.shipping_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, shipping_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Payment Method
                    </label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => {
                        const paymentMethod = e.target.value as 'cash' | 'card' | 'tabby'
                        const totalOrderAmount = orderItems.reduce((sum, item) => sum + item.total_price, 0)
                        const calculatedFees = calculatePaymentFees(paymentMethod, totalOrderAmount)
                        setFormData(prev => ({ 
                          ...prev, 
                          payment_method: paymentMethod,
                          payment_fees: calculatedFees
                        }))
                      }}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="tabby">Tabby</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'pending' | 'completed' | 'canceled' }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      required
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Payment Fees (AED)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.payment_fees}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_fees: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Delivery Fees (AED)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.delivery_fees}
                      onChange={(e) => setFormData(prev => ({ ...prev, delivery_fees: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      placeholder="20.00"
                    />
                  </div>
                </div>



                {/* Order Items */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-foreground">
                      Order Items
                    </label>
                    <button
                      type="button"
                      onClick={addOrderItem}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add Product
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Header Row - Hidden on mobile */}
                    <div className="hidden sm:grid grid-cols-7 gap-2 p-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <div>Product</div>
                      <div>Size</div>
                      <div>Qty</div>
                      <div>Price</div>
                      <div>Total</div>
                      <div>Stock</div>
                      <div>Action</div>
                    </div>
                    
                    {orderItems.map((item, index) => (
                      <div key={index} className="border border-border rounded-md p-4 space-y-3">
                        {/* Mobile Layout */}
                        <div className="sm:hidden space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Product</label>
                            <select
                              value={item.product_id}
                              onChange={(e) => handleProductChange(index, e.target.value)}
                              className="w-full px-3 py-2 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                              required
                            >
                              <option value="">Select Product</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id.toString()}>
                                  {product.name} (Qty: {product.quantity})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Size</label>
                              <select
                                value={item.size}
                                onChange={(e) => handleSizeChange(index, e.target.value)}
                                className="w-full px-3 py-2 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                                required
                                disabled={!item.product_id}
                              >
                                <option value="">Select Size</option>
                                {item.product_id && getAvailableSizes(item.product_id).map((variant) => (
                                  <option key={variant.id} value={variant.size}>
                                    {variant.size} (Qty: {variant.quantity})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Quantity</label>
                              <input
                                type="number"
                                placeholder="Qty"
                                value={item.quantity}
                                onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                                min="1"
                                max={item.size ? getAvailableQuantity(item.product_id, item.size) : 1}
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Price per Piece</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Price"
                              value={item.price_per_piece}
                              onChange={(e) => updateOrderItem(index, 'price_per_piece', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                              required
                            />
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                Total: AED {item.total_price.toFixed(2)}
                              </div>
                              {item.size && (
                                <div className="text-xs text-muted-foreground">
                                  Available: {getAvailableQuantity(item.product_id, item.size)}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeOrderItem(index)}
                              className="px-3 py-2 text-red-600 hover:bg-red-100 rounded text-sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden sm:grid grid-cols-7 gap-2 p-3">
                          <select
                            value={item.product_id}
                            onChange={(e) => handleProductChange(index, e.target.value)}
                            className="px-2 py-1 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                            required
                          >
                            <option value="">Select Product</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id.toString()}>
                                {product.name} (Qty: {product.quantity})
                              </option>
                            ))}
                          </select>
                          <select
                            value={item.size}
                            onChange={(e) => handleSizeChange(index, e.target.value)}
                            className="px-2 py-1 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                            required
                            disabled={!item.product_id}
                          >
                            <option value="">Select Size</option>
                            {item.product_id && getAvailableSizes(item.product_id).map((variant) => (
                              <option key={variant.id} value={variant.size}>
                                {variant.size} (Qty: {variant.quantity})
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="px-2 py-1 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                            min="1"
                            max={item.size ? getAvailableQuantity(item.product_id, item.size) : 1}
                            required
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Price"
                            value={item.price_per_piece}
                            onChange={(e) => updateOrderItem(index, 'price_per_piece', parseFloat(e.target.value) || 0)}
                            className="px-2 py-1 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                            required
                          />
                          <div className="px-2 py-1 text-sm text-foreground">
                            AED {item.total_price.toFixed(2)}
                          </div>
                          <div className="px-2 py-1 text-xs text-muted-foreground">
                            {item.size ? `Available: ${getAvailableQuantity(item.product_id, item.size)}` : ''}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeOrderItem(index)}
                            className="px-2 py-1 text-red-600 hover:bg-red-100 rounded text-sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {orderItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="mx-auto h-8 w-8 mb-2" />
                      <p>No products added to order</p>
                    </div>
                  )}

                  {/* Order Summary */}
                  {orderItems.length > 0 && (
                    <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                      <h3 className="font-medium text-foreground mb-2">
                        Order Summary ({orderItems.length} {orderItems.length === 1 ? 'Product' : 'Products'})
                      </h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Products Total:</span>
                          <span>AED {orderItems.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Payment Fees (distributed across products):</span>
                          <span>AED {formData.payment_fees.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Delivery Fees (distributed across products):</span>
                          <span>AED {formData.delivery_fees.toFixed(2)}</span>
                        </div>
                        <div className="border-t pt-1 font-medium">
                          <div className="flex justify-between">
                            <span>Customer Pays:</span>
                            <span>AED {orderItems.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          * Each product will be stored as a separate order row with its own size and quantity
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={orderItems.length === 0}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Order
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setOrderItems([])
                      setFormData({
                        order_number: '',
                        shipping_number: '',
                        payment_method: 'cash',
                        payment_fees: 0,
                        delivery_fees: 20,
                        status: 'pending'
                      })
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
