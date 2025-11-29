'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, ShoppingCart, Calendar, DollarSign, X, CheckCircle, Trash2, Edit, Filter, RefreshCw } from 'lucide-react'
import { calculatePaymentFees } from '@/lib/utils/paymentFees'
import { sendOrderEmail } from '@/lib/utils/order-email'
import DateFilter from '@/components/DateFilter'

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

// Size order for sorting
const SIZE_ORDER = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']

const sortVariantsBySize = (variants: ProductVariant[]) => {
  return [...variants].sort((a, b) => {
    const indexA = SIZE_ORDER.indexOf(a.size.toUpperCase())
    const indexB = SIZE_ORDER.indexOf(b.size.toUpperCase())
    // If size not found in order, put it at the end
    const orderA = indexA === -1 ? SIZE_ORDER.length : indexA
    const orderB = indexB === -1 ? SIZE_ORDER.length : indexB
    return orderA - orderB
  })
}

interface ExchangeData {
  order: Order | null
  originalOrderDetails: any[]
  newProduct: {
    product_id: string
    product_name: string
    size: string
    quantity: number
    price_per_piece: number
    total_price: number
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showExchangeModal, setShowExchangeModal] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [exchangeData, setExchangeData] = useState<ExchangeData>({
    order: null,
    originalOrderDetails: [],
    newProduct: {
      product_id: '',
      product_name: '',
      size: '',
      quantity: 1,
      price_per_piece: 0,
      total_price: 0
    }
  })
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | 'pending' | 'completed' | 'canceled',
    paymentMethod: 'all' as 'all' | 'cash' | 'card' | 'tabby',
    dateFilter: 'month' as 'all' | 'today' | 'week' | 'month' | 'year' | 'custom',
    customDateFrom: '',
    customDateTo: ''
  })
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

  useEffect(() => {
    applyFilters()
  }, [orders, filters])

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

  const applyFilters = () => {
    let filtered = [...orders]

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status)
    }

    // Filter by payment method
    if (filters.paymentMethod !== 'all') {
      filtered = filtered.filter(order => order.payment_method?.toLowerCase() === filters.paymentMethod)
    }

    // Filter by date
    if (filters.dateFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at)
        
        switch (filters.dateFilter) {
          case 'today':
            return orderDate >= today
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            return orderDate >= weekAgo
          case 'month':
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
            endOfMonth.setHours(23, 59, 59, 999)
            return orderDate >= startOfMonth && orderDate <= endOfMonth
          case 'year':
            const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)
            return orderDate >= yearAgo
          case 'custom':
            if (filters.customDateFrom && filters.customDateTo) {
              const fromDate = new Date(filters.customDateFrom)
              const toDate = new Date(filters.customDateTo)
              toDate.setHours(23, 59, 59, 999) // Include the entire end date
              return orderDate >= fromDate && orderDate <= toDate
            }
            return true
          default:
            return true
        }
      })
    }

    setFilteredOrders(filtered)
  }

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
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
    const variants = productVariants.filter(v => v.product_id.toString() === productId)
    return sortVariantsBySize(variants)
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
      const orderNumber = formData.order_number ? parseInt(formData.order_number) : Math.floor(Math.random() * 9000) + 1000
      const shippingNumber = formData.shipping_number ? parseInt(formData.shipping_number) : Math.floor(Math.random() * 900000) + 100000

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

        // Update product variant quantity
        const variant = productVariants.find(v => 
          v.product_id.toString() === item.product_id && v.size === item.size
        )
        if (variant) {
          await supabase
            .from('product_variants')
            .update({ quantity: Math.max(0, variant.quantity - item.quantity) })
            .eq('id', variant.id)
        }
        
        // Update product total quantity
        const product = products.find(p => p.id.toString() === item.product_id)
        if (product) {
          await supabase
            .from('products')
            .update({ quantity: Math.max(0, product.quantity - item.quantity) })
            .eq('id', product.id)
        }
      }

      // Send email notification for new order (one email with all items)
      try {
        const orderItemsForEmail = orderItems.map(item => ({
          product_name: item.product_name,
          size: item.size,
          quantity: item.quantity,
          unit_price: item.total_price / item.quantity,
          total_price: item.total_price
        }))

        await sendOrderEmail({
          order_number: orderNumber,
          shipping_number: shippingNumber,
          status: formData.status,
          items: orderItemsForEmail,
          payment_method: formData.payment_method,
          payment_fees: formData.payment_fees,
          delivery_fees: formData.delivery_fees,
          created_at: new Date().toISOString()
        })
      } catch (emailError) {
        console.error('Error sending email notification:', emailError)
        // Don't fail the order creation if email fails
      }

      setSuccessMessage('Order created successfully! Each product saved as separate row.')
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
        .select(`
          *,
          products (
            name,
            cost_per_piece
          )
        `)
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
        const oldStatus = order.status

        // Handle quantity restoration for canceled orders
        if (newStatus === 'canceled' && oldStatus !== 'canceled') {
          // Restore quantities for all products in this order
          for (const orderItem of orderData) {
            // Find the product variant to restore quantity
            const variant = productVariants.find(v => 
              v.product_id === orderItem.product_id && v.size === orderItem.sizes
            )
            
            if (variant) {
              // Restore variant quantity
              const { error: variantError } = await supabase
                .from('product_variants')
                .update({ 
                  quantity: variant.quantity + orderItem.quantity 
                })
                .eq('id', variant.id)

              if (variantError) {
                console.error('Error restoring variant quantity:', variantError)
              }
            }
            
            // Also restore the product total quantity
            const product = products.find(p => p.id.toString() === orderItem.product_id.toString())
            if (product) {
              const { error: productError } = await supabase
                .from('products')
                .update({ 
                  quantity: product.quantity + orderItem.quantity 
                })
                .eq('id', orderItem.product_id)

              if (productError) {
                console.error('Error restoring product quantity:', productError)
              }
            }
          }
        }

        // Handle quantity deduction for completed orders (from pending or canceled)
        if (newStatus === 'completed' && oldStatus !== 'completed') {
          // Only deduct if previously canceled (pending orders already had quantity deducted on creation)
          if (oldStatus === 'canceled') {
            // Deduct quantities for all products in this order
            for (const orderItem of orderData) {
              // Find the product variant to deduct quantity
              const variant = productVariants.find(v => 
                v.product_id === orderItem.product_id && v.size === orderItem.sizes
              )
              
              if (variant) {
                // Deduct variant quantity
                const { error: variantError } = await supabase
                  .from('product_variants')
                  .update({ 
                    quantity: Math.max(0, variant.quantity - orderItem.quantity)
                  })
                  .eq('id', variant.id)

                if (variantError) {
                  console.error('Error deducting variant quantity:', variantError)
                }
              }
              
              // Also deduct from the product total quantity
              const product = products.find(p => p.id.toString() === orderItem.product_id.toString())
              if (product) {
                const { error: productError } = await supabase
                  .from('products')
                  .update({ 
                    quantity: Math.max(0, product.quantity - orderItem.quantity)
                  })
                  .eq('id', orderItem.product_id)

                if (productError) {
                  console.error('Error deducting product quantity:', productError)
                }
              }
            }
          }
        }
        
        // Handle quantity restoration when going from pending to canceled
        // (pending orders already have quantity deducted, so restore it)
        if (newStatus === 'canceled' && oldStatus === 'pending') {
          // Quantity was already restored above in the canceled block
        }

        // Update all orders with the same order number
        const { error: updateError } = await supabase
          .from('orders')
          .update({ status: newStatus })
          .eq('order_number', order.order_number)

        if (updateError) throw updateError

        // Send email notification for status changes
        try {
          const orderItemsForEmail = orderData.map(item => ({
            product_name: (item.products as any)?.name || 'Unknown Product',
            size: item.sizes,
            quantity: item.quantity,
            unit_price: item.total_price / item.quantity,
            total_price: item.total_price
          }))

          await sendOrderEmail({
            order_number: orderData[0].order_number,
            shipping_number: orderData[0].shipping_number,
            status: newStatus,
            items: orderItemsForEmail,
            payment_method: orderData[0].payment_method,
            payment_fees: orderData[0].payment_fees,
            delivery_fees: orderData[0].delivery_fees,
            created_at: orderData[0].created_at
          })
        } catch (emailError) {
          console.error('Error sending email notification:', emailError)
          // Don't fail the order update if email fails
        }

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

  const handleOpenExchangeModal = async (order: Order) => {
    try {
      // Get all orders with the same order number
      const { data: orderData, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          products (
            id,
            name,
            cost_per_piece,
            price_per_piece
          )
        `)
        .eq('order_number', order.order_number)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      if (!orderData || orderData.length === 0) {
        alert('Order not found')
        return
      }

      // Set exchange data with the first item as the one to exchange
      const firstOrder = orderData[0]
      setExchangeData({
        order: order,
        originalOrderDetails: orderData,
        newProduct: {
          product_id: firstOrder.product_id.toString(),
          product_name: (firstOrder.products as any)?.name || 'Unknown Product',
          size: firstOrder.sizes || '',
          quantity: firstOrder.quantity,
          price_per_piece: firstOrder.total_price / firstOrder.quantity,
          total_price: firstOrder.total_price
        }
      })
      setShowExchangeModal(true)
    } catch (error) {
      console.error('Error opening exchange modal:', error)
      alert('Error loading order details. Please try again.')
    }
  }

  const handleExchangeProductChange = (productId: string) => {
    const product = products.find(p => p.id.toString() === productId)
    
    if (product) {
      setExchangeData(prev => ({
        ...prev,
        newProduct: {
          ...prev.newProduct,
          product_id: productId,
          product_name: product.name,
          price_per_piece: product.price_per_piece,
          total_price: product.price_per_piece * prev.newProduct.quantity,
          size: '' // Reset size when product changes
        }
      }))
    }
  }

  const handleExchangeSizeChange = (size: string) => {
    const variant = productVariants.find(v => 
      v.product_id.toString() === exchangeData.newProduct.product_id && v.size === size
    )
    
    if (variant) {
      setExchangeData(prev => ({
        ...prev,
        newProduct: {
          ...prev.newProduct,
          size: size,
          price_per_piece: variant.price,
          total_price: variant.price * prev.newProduct.quantity
        }
      }))
    }
  }

  const handleExchangeQuantityChange = (quantity: number) => {
    setExchangeData(prev => ({
      ...prev,
      newProduct: {
        ...prev.newProduct,
        quantity: quantity,
        total_price: prev.newProduct.price_per_piece * quantity
      }
    }))
  }

  const handleExchangeSubmit = async () => {
    if (!exchangeData.order || !exchangeData.newProduct.product_id || !exchangeData.newProduct.size) {
      alert('Please select a product and size for the exchange')
      return
    }

    // Check if there's enough stock for the new product
    const newVariant = productVariants.find(v => 
      v.product_id.toString() === exchangeData.newProduct.product_id && v.size === exchangeData.newProduct.size
    )
    
    if (!newVariant || newVariant.quantity < exchangeData.newProduct.quantity) {
      alert(`Insufficient stock for ${exchangeData.newProduct.product_name} - Size ${exchangeData.newProduct.size}. Available: ${newVariant?.quantity || 0}`)
      return
    }

    try {
      const oldOrderDetails = exchangeData.originalOrderDetails
      const oldTotalPrice = oldOrderDetails.reduce((sum, o) => sum + o.total_price, 0)
      const newTotalPrice = exchangeData.newProduct.total_price
      const priceDifference = newTotalPrice - oldTotalPrice

      // 1. Restore quantities for OLD products (restore stock)
      for (const oldOrder of oldOrderDetails) {
        // Find and restore old variant quantity
        const oldVariant = productVariants.find(v => 
          v.product_id === oldOrder.product_id && v.size === oldOrder.sizes
        )
        
        if (oldVariant) {
          const { error: variantRestoreError } = await supabase
            .from('product_variants')
            .update({ quantity: oldVariant.quantity + oldOrder.quantity })
            .eq('id', oldVariant.id)
          
          if (variantRestoreError) console.error('Error restoring variant quantity:', variantRestoreError)
        }
        
        // Restore product total quantity
        const oldProduct = products.find(p => p.id.toString() === oldOrder.product_id.toString())
        if (oldProduct) {
          const { error: productRestoreError } = await supabase
            .from('products')
            .update({ quantity: oldProduct.quantity + oldOrder.quantity })
            .eq('id', oldOrder.product_id)
          
          if (productRestoreError) console.error('Error restoring product quantity:', productRestoreError)
        }
      }

      // 2. Deduct quantities for NEW product
      // IMPORTANT: Fetch fresh quantities from database to avoid using stale local state
      // This prevents double-deduction issues when exchanging to same product with different size
      
      // Fetch current variant quantity from database
      const { data: freshVariant, error: freshVariantError } = await supabase
        .from('product_variants')
        .select('quantity')
        .eq('id', newVariant.id)
        .single()
      
      if (freshVariantError) {
        console.error('Error fetching fresh variant quantity:', freshVariantError)
      }
      
      // Deduct from variant using fresh database value
      const currentVariantQty = freshVariant?.quantity ?? newVariant.quantity
      const { error: variantDeductError } = await supabase
        .from('product_variants')
        .update({ quantity: Math.max(0, currentVariantQty - exchangeData.newProduct.quantity) })
        .eq('id', newVariant.id)
      
      if (variantDeductError) console.error('Error deducting variant quantity:', variantDeductError)
      
      // Fetch current product quantity from database
      const { data: freshProduct, error: freshProductError } = await supabase
        .from('products')
        .select('quantity')
        .eq('id', exchangeData.newProduct.product_id)
        .single()
      
      if (freshProductError) {
        console.error('Error fetching fresh product quantity:', freshProductError)
      }
      
      // Deduct from product total using fresh database value
      const currentProductQty = freshProduct?.quantity ?? 0
      const { error: productDeductError } = await supabase
        .from('products')
        .update({ quantity: Math.max(0, currentProductQty - exchangeData.newProduct.quantity) })
        .eq('id', exchangeData.newProduct.product_id)
      
      if (productDeductError) console.error('Error deducting product quantity:', productDeductError)

      // 3. Delete old order rows
      for (const oldOrder of oldOrderDetails) {
        const { error: deleteError } = await supabase
          .from('orders')
          .delete()
          .eq('id', oldOrder.id)
        
        if (deleteError) console.error('Error deleting old order:', deleteError)
      }

      // 4. Create new order row with updated details
      // IMPORTANT: Keep the original payment fees from the old order
      // If price is higher, the difference is paid by cash (no fees on difference)
      // Payment fees should only apply to the original order amount
      const originalPaymentFees = oldOrderDetails.reduce((sum, o) => sum + (o.payment_fees || 0), 0)
      
      // Determine the payment method to record:
      // - If new price <= old price: keep original payment method
      // - If new price > old price: still keep original method (difference paid by cash, but we don't add fees)
      const paymentMethod = oldOrderDetails[0].payment_method
      
      const { error: insertError } = await supabase
        .from('orders')
        .insert({
          product_id: parseInt(exchangeData.newProduct.product_id),
          order_number: exchangeData.order.order_number,
          shipping_number: exchangeData.order.shipping_number,
          paid_amount: newTotalPrice,
          total_price: newTotalPrice,
          quantity: exchangeData.newProduct.quantity,
          sizes: exchangeData.newProduct.size,
          payment_method: paymentMethod,
          payment_fees: originalPaymentFees, // Keep original fees, no fees on cash difference
          delivery_fees: oldOrderDetails[0].delivery_fees,
          status: oldOrderDetails[0].status
        })

      if (insertError) throw insertError

      // 5. Send exchange email notification
      try {
        const oldItems = oldOrderDetails.map(order => ({
          product_name: (order.products as any)?.name || 'Unknown Product',
          size: order.sizes,
          quantity: order.quantity,
          unit_price: order.total_price / order.quantity,
          total_price: order.total_price
        }))

        const newItems = [{
          product_name: exchangeData.newProduct.product_name,
          size: exchangeData.newProduct.size,
          quantity: exchangeData.newProduct.quantity,
          unit_price: exchangeData.newProduct.price_per_piece,
          total_price: exchangeData.newProduct.total_price
        }]

        await fetch('/api/send-exchange-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_number: exchangeData.order.order_number,
            shipping_number: exchangeData.order.shipping_number,
            old_items: oldItems,
            new_items: newItems,
            price_difference: priceDifference,
            exchange_date: new Date().toISOString()
          })
        })
      } catch (emailError) {
        console.error('Error sending exchange email:', emailError)
        // Don't fail the exchange if email fails
      }

      // Close modal and refresh data
      setShowExchangeModal(false)
      setExchangeData({
        order: null,
        originalOrderDetails: [],
        newProduct: {
          product_id: '',
          product_name: '',
          size: '',
          quantity: 1,
          price_per_piece: 0,
          total_price: 0
        }
      })
      
      setSuccessMessage(`Order #${exchangeData.order.order_number} exchanged successfully!${priceDifference !== 0 ? ` Price difference: AED ${priceDifference.toFixed(2)}` : ''}`)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 4000)
      
      fetchData()
    } catch (error) {
      console.error('Error processing exchange:', error)
      alert('Error processing exchange. Please try again.')
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
            <span>{successMessage || 'Order created successfully! Each product saved as separate row.'}</span>
          </div>
        </div>
      )}

      {/* Orders Display */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {/* Filter Controls */}
        <div className="p-4 border-b border-border bg-muted/50">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filters:</span>
            </div>
            
            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground min-w-[140px]"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
            </select>

            {/* Payment Method Tabs */}
            <div className="flex items-center gap-2">
              {(['all','cash','card','tabby'] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => handleFilterChange('paymentMethod', method)}
                  className={`px-3 py-1.5 rounded text-sm border ${filters.paymentMethod === method ? 'bg-blue-600 text-white border-blue-600' : 'bg-background text-foreground border-input'}`}
                >
                  {method === 'all' ? 'All' : method.charAt(0).toUpperCase() + method.slice(1)}
                </button>
              ))}
            </div>

            <div className="text-sm text-muted-foreground ml-auto">
              Showing {filteredOrders.length} of {orders.length} orders
            </div>
          </div>
        </div>

        {/* Date Filter */}
        <DateFilter
          dateFilter={filters.dateFilter}
          customDateFrom={filters.customDateFrom}
          customDateTo={filters.customDateTo}
          onFilterChange={handleFilterChange}
          totalCount={orders.length}
          filteredCount={filteredOrders.length}
        />

        {/* Mobile Card View */}
        <div className="block lg:hidden">
          {filteredOrders.map((order, index) => (
            <div key={order.id} className={`p-4 ${index < filteredOrders.length - 1 ? 'border-b-2 border-blue-200 dark:border-blue-800 mb-4' : ''}`}>
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
                      onClick={() => handleOpenExchangeModal(order)}
                      className="text-orange-600 hover:text-orange-800 p-1"
                      title="Exchange Order"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
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
                  Net
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
              {filteredOrders.map((order, index) => (
                <tr key={order.id} className={`hover:bg-muted/30 ${index < filteredOrders.length - 1 ? 'border-b-2 border-blue-200 dark:border-blue-800' : ''}`}>
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
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-muted-foreground mr-1" />
                      <span>
                        AED {(
                          (order.total_price || 0) - (order.delivery_fees || 0) - (order.payment_fees || 0)
                        ).toFixed(2)}
                      </span>
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
                        onClick={() => handleOpenExchangeModal(order)}
                        className="text-orange-600 hover:text-orange-800"
                        title="Exchange Order"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
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

      {/* Exchange Order Modal */}
      {showExchangeModal && exchangeData.order && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowExchangeModal(false)
            setExchangeData({
              order: null,
              originalOrderDetails: [],
              newProduct: {
                product_id: '',
                product_name: '',
                size: '',
                quantity: 1,
                price_per_piece: 0,
                total_price: 0
              }
            })
          }}
        >
          <div 
            className="bg-card border border-border rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-2 sm:mx-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-border bg-orange-50 dark:bg-orange-900/20">
              <div>
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-orange-600" />
                  Exchange Order #{exchangeData.order.order_number}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Change the product or size for this order
                </p>
              </div>
              <button
                onClick={() => {
                  setShowExchangeModal(false)
                  setExchangeData({
                    order: null,
                    originalOrderDetails: [],
                    newProduct: {
                      product_id: '',
                      product_name: '',
                      size: '',
                      quantity: 1,
                      price_per_piece: 0,
                      total_price: 0
                    }
                  })
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {/* Original Order Details */}
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                  <span className="text-lg">❌</span> Original Order (To Be Returned)
                </h3>
                <div className="space-y-2">
                  {exchangeData.originalOrderDetails.map((order, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-medium">{(order.products as any)?.name || 'Unknown Product'}</span>
                        <span className="text-muted-foreground ml-2">Size: {order.sizes}</span>
                        <span className="text-muted-foreground ml-2">Qty: {order.quantity}</span>
                      </div>
                      <span className="font-medium">AED {order.total_price.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-red-300 dark:border-red-700 flex justify-between">
                    <span className="font-medium text-red-800 dark:text-red-200">Original Total:</span>
                    <span className="font-bold text-red-600">
                      AED {exchangeData.originalOrderDetails.reduce((sum, o) => sum + o.total_price, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* New Product Selection */}
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
                  <span className="text-lg">✅</span> New Product (Exchange To)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Product
                    </label>
                    <select
                      value={exchangeData.newProduct.product_id}
                      onChange={(e) => handleExchangeProductChange(e.target.value)}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-foreground"
                      required
                    >
                      <option value="">Select Product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id.toString()}>
                          {product.name} (Available: {product.quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Size
                    </label>
                    <select
                      value={exchangeData.newProduct.size}
                      onChange={(e) => handleExchangeSizeChange(e.target.value)}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-foreground"
                      required
                      disabled={!exchangeData.newProduct.product_id}
                    >
                      <option value="">Select Size</option>
                      {exchangeData.newProduct.product_id && getAvailableSizes(exchangeData.newProduct.product_id).map((variant) => (
                        <option key={variant.id} value={variant.size}>
                          {variant.size} (Available: {variant.quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={exchangeData.newProduct.quantity}
                      onChange={(e) => handleExchangeQuantityChange(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-foreground"
                      min="1"
                      max={exchangeData.newProduct.size ? getAvailableQuantity(exchangeData.newProduct.product_id, exchangeData.newProduct.size) : 1}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Price Per Piece
                    </label>
                    <div className="w-full px-3 py-2 border border-input bg-muted rounded-md text-foreground">
                      AED {exchangeData.newProduct.price_per_piece.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-2 border-t border-green-300 dark:border-green-700 flex justify-between">
                  <span className="font-medium text-green-800 dark:text-green-200">New Total:</span>
                  <span className="font-bold text-green-600">
                    AED {exchangeData.newProduct.total_price.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Price Difference Summary */}
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-3">
                  Exchange Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Original Order Total:</span>
                    <span>AED {exchangeData.originalOrderDetails.reduce((sum, o) => sum + o.total_price, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Order Total:</span>
                    <span>AED {exchangeData.newProduct.total_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-amber-300 dark:border-amber-700 font-bold">
                    <span>Price Difference:</span>
                    <span className={
                      exchangeData.newProduct.total_price - exchangeData.originalOrderDetails.reduce((sum, o) => sum + o.total_price, 0) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }>
                      {exchangeData.newProduct.total_price - exchangeData.originalOrderDetails.reduce((sum, o) => sum + o.total_price, 0) >= 0 ? '+' : ''}
                      AED {(exchangeData.newProduct.total_price - exchangeData.originalOrderDetails.reduce((sum, o) => sum + o.total_price, 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
                {exchangeData.newProduct.total_price !== exchangeData.originalOrderDetails.reduce((sum, o) => sum + o.total_price, 0) && (
                  <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                    {exchangeData.newProduct.total_price > exchangeData.originalOrderDetails.reduce((sum, o) => sum + o.total_price, 0)
                      ? '💰 Customer owes additional payment (paid by cash - no payment fees on difference)'
                      : '💸 Customer is owed a refund'}
                  </p>
                )}
              </div>

              {/* What will happen */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  What will happen when you confirm:
                </h3>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>✓ Original product quantities will be restored to inventory</li>
                  <li>✓ New product quantities will be deducted from inventory</li>
                  <li>✓ Order will be updated with new product details</li>
                  <li>✓ Payment fees will remain from original order (no fees on cash difference)</li>
                  <li>✓ Profits will be automatically recalculated</li>
                  <li>✓ Exchange notification email will be sent</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleExchangeSubmit}
                  disabled={!exchangeData.newProduct.product_id || !exchangeData.newProduct.size}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Confirm Exchange
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExchangeModal(false)
                    setExchangeData({
                      order: null,
                      originalOrderDetails: [],
                      newProduct: {
                        product_id: '',
                        product_name: '',
                        size: '',
                        quantity: 1,
                        price_per_piece: 0,
                        total_price: 0
                      }
                    })
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
