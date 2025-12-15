'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, DollarSign, Download } from 'lucide-react'
import DateFilter from '@/components/DateFilter'

interface Profit {
  id: string
  order_id: string
  investor_id: string
  gross_profit: number
  net_profit: number
  cost_per_piece?: number
  price_per_piece?: number
  created_at: string
  product_name: string
  sizes: string
  quantity: number
  order_number: number
  investor_name: string
  orders?: {
    product_id: string
    sizes: string
    quantity: number
    order_number: number
    total_price: number
    status: string
    delivery_fees: number
    payment_fees: number
    created_at?: string
    cost_per_piece?: number
    price_per_piece?: number
    products?: {
      name: string
      cost_per_piece?: number
      price_per_piece?: number
    }
  } | null
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function ProfitsPage() {
  const [profits, setProfits] = useState<Profit[]>([])
  const [filteredProfits, setFilteredProfits] = useState<Profit[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [shipments, setShipments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    dateFilter: 'month' as 'all' | 'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'custom',
    customDateFrom: '',
    customDateTo: ''
  })
  const supabase = createClient()

  useEffect(() => {
    fetchProfits()
    fetchExpenses()
    fetchShipments()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [profits, filters])

  const fetchProfits = async () => {
    try {
      // Fetch profits with related order and product data
      const { data: profitsData, error: profitsError } = await supabase
        .from('profits')
        .select(`
          id,
          order_id,
          investor_id,
          gross_profit,
          net_profit,
          cost_per_piece,
          price_per_piece,
          created_at,
          orders (
            id,
            product_id,
            order_number,
            sizes,
            quantity,
            total_price,
            status,
            delivery_fees,
            payment_fees,
            cost_per_piece,
            price_per_piece,
            created_at,
            products (
              name,
              cost_per_piece,
              price_per_piece
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (profitsError) {
        console.error('Error fetching profits:', profitsError)
        throw profitsError
      }

      // Transform profits data to match the expected format
      const transformedProfits = profitsData.map(profit => {
        const order = profit.orders as any
        // Use stored cost_per_piece and price_per_piece from profits table (most accurate)
        // Fall back to order or product if not available
        const costPerPiece = profit.cost_per_piece ?? order?.cost_per_piece ?? order?.products?.cost_per_piece ?? 0
        const pricePerPiece = profit.price_per_piece ?? order?.price_per_piece ?? order?.products?.price_per_piece ?? 0
        
        // Ensure we have valid order data - if orders is null, we still need to show the profit
        
        return {
          id: profit.id,
          order_id: profit.order_id,
          investor_id: profit.investor_id || 'shady',
          gross_profit: profit.gross_profit || 0,
          net_profit: profit.net_profit || 0,
          cost_per_piece: costPerPiece, // Store cost per piece from profits table
          price_per_piece: pricePerPiece, // Store price per piece from profits table
          created_at: profit.created_at,
          product_name: order?.products?.name || 'Unknown Product',
          sizes: order?.sizes || 'Unknown Size',
          quantity: order?.quantity || 0,
          order_number: order?.order_number || 0,
          investor_name: 'Unknown Investor', // Not used in our calculation
          orders: order ? {
            product_id: order.product_id,
            sizes: order.sizes,
            quantity: order.quantity || 0,
            order_number: order.order_number || 0,
            total_price: order.total_price || 0,
            status: order.status || 'unknown',
            delivery_fees: order.delivery_fees || 0,
            payment_fees: order.payment_fees || 0,
            created_at: order.created_at || profit.created_at, // Include order's created_at for date filtering
            products: {
              name: order.products?.name || 'Unknown Product',
              cost_per_piece: costPerPiece, // Use stored cost from profits table
              price_per_piece: pricePerPiece
            }
          } : null
        }
      })

      setProfits(transformedProfits)
    } catch (error) {
      console.error('Error fetching profits:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setExpenses(data)
    } catch (error) {
      console.error('Error fetching expenses:', error)
    }
  }

  const fetchShipments = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setShipments(data)
    } catch (error) {
      console.error('Error fetching shipments:', error)
    }
  }

  const applyFilters = () => {
    let filtered = [...profits]

    // Filter by date - use order's created_at date, not profit's created_at
    if (filters.dateFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      filtered = filtered.filter(profit => {
        // Use order's created_at if available, otherwise fall back to profit's created_at
        const orderDate = profit.orders?.created_at 
          ? new Date(profit.orders.created_at)
          : new Date(profit.created_at)
        
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
          case 'lastMonth':
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
            lastMonthEnd.setHours(23, 59, 59, 999)
            return orderDate >= lastMonthStart && orderDate <= lastMonthEnd
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

    setFilteredProfits(filtered)
  }

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }

  // Group profits by order_id to get unique orders (since each order can have multiple profit rows for different investors)
  const uniqueOrdersByOrderId = filteredProfits.reduce((acc, profit) => {
    const orderId = profit.order_id
    if (orderId && !acc[orderId]) {
      acc[orderId] = profit
    }
    return acc
  }, {} as Record<string, Profit>)

  // Get unique orders array (one per order_id)
  const uniqueOrdersArray = Object.values(uniqueOrdersByOrderId)

  // Separate completed and canceled orders (using unique orders only)
  const completedOrders = uniqueOrdersArray.filter(profit => {
    const status = profit.orders?.status
    // If status is explicitly canceled, exclude it
    if (status === 'canceled') return false
    // Include if status is completed, or if status is not available (assume completed)
    return status === 'completed' || !status || status === 'pending'
  })
  const canceledOrders = uniqueOrdersArray.filter(profit => {
    const status = profit.orders?.status
    return status === 'canceled'
  })

  // Count unique order numbers for completed orders
  const completedOrderNumbers = new Set(
    completedOrders.map(p => p.order_number || p.orders?.order_number).filter(Boolean)
  )
  
  // Count unique order numbers for canceled orders
  const canceledOrderNumbers = new Set(
    canceledOrders.map(p => p.order_number || p.orders?.order_number).filter(Boolean)
  )
  
  // Total unique order numbers (completed + canceled, but don't double count)
  const totalOrderNumbers = new Set([...Array.from(completedOrderNumbers), ...Array.from(canceledOrderNumbers)])
  
  // Group orders by order_number for display
  const uniqueOrdersByOrderNumber = uniqueOrdersArray.reduce((acc, profit) => {
    const orderNumber = profit.order_number || profit.orders?.order_number
    if (orderNumber && !acc[orderNumber]) {
      acc[orderNumber] = profit.orders || profit
    }
    return acc
  }, {} as Record<number, any>)

  // Identify exchanged orders: orders with "original size:" in sizes field
  // This is the new way exchanges are tracked (original orders are deleted, not canceled)
  const exchangeFeatureStartDate = new Date('2025-12-01')
  
  // Find exchanged orders by checking if sizes field contains "original size:"
  const exchangedOrdersMap = filteredProfits.reduce((acc, profit) => {
    const orderNumber = profit.order_number || profit.orders?.order_number
    if (!orderNumber) return acc
    
    // Get order date to filter exchanges
    const orderDate = profit.orders?.created_at 
      ? new Date(profit.orders.created_at)
      : new Date(profit.created_at)
    
    // Only include orders from when exchange feature was implemented (December 2025+)
    if (orderDate < exchangeFeatureStartDate) return acc
    
    // Check if this order is an exchange (sizes field contains "original size:")
    const sizes = profit.orders?.sizes || profit.sizes || ''
    if (sizes.includes('original size:')) {
      if (!acc[orderNumber]) {
        acc[orderNumber] = []
      }
      acc[orderNumber].push(profit)
    }
    return acc
  }, {} as Record<number, Profit[]>)


  // Calculate total revenue from completed orders only (using unique orders)
  // Use gross_profit + (cost * quantity) to get total_price if orders.total_price is missing
  const totalRevenue = completedOrders.reduce((sum, profit) => {
    if (profit.orders?.total_price) {
      return sum + profit.orders.total_price
    }
    // Fallback: calculate from gross_profit and cost
    const costPerPiece = profit.cost_per_piece || 0
    const quantity = profit.orders?.quantity || profit.quantity || 0
    const grossProfit = profit.gross_profit || 0
    // total_price = gross_profit + (cost_per_piece * quantity)
    const calculatedTotal = grossProfit + (costPerPiece * quantity)
    return sum + calculatedTotal
  }, 0)
  
  // Calculate total pieces sold from completed orders only (using unique orders)
  const totalPiecesSold = completedOrders.reduce((sum, profit) => {
    return sum + (profit.orders?.quantity || profit.quantity || 0)
  }, 0)
  
  // Calculate total deductions from completed orders (delivery fees + payment fees)
  const totalOrderDeductions = completedOrders.reduce((sum, profit) => {
    const deliveryFees = profit.orders?.delivery_fees || 0
    const paymentFees = profit.orders?.payment_fees || 0
    return sum + deliveryFees + paymentFees
  }, 0)
  
  // Calculate total product costs from completed orders only (cost per piece × quantity sold)
  // IMPORTANT: Use cost_per_piece from orders table (stored at order time) × quantity for each order item
  // Since profits table has one row per investor per order, we need to get unique orders first
  // Group by order_id to avoid double counting
  const uniqueCompletedOrderIds = new Set(completedOrders.map(p => p.order_id))
  const totalProductCosts = Array.from(uniqueCompletedOrderIds).reduce((sum, orderId) => {
    // Find the first profit record for this order_id (they all have the same order data)
    const profit = completedOrders.find(p => p.order_id === orderId)
    if (!profit) return sum
    
    // Get cost_per_piece from order (most accurate, stored at order time)
    const costPerPiece = profit.orders?.cost_per_piece ?? profit.cost_per_piece ?? 0
    const quantity = profit.orders?.quantity || profit.quantity || 0
    // Calculate cost for this specific order item: cost_per_piece × quantity
    const itemCost = costPerPiece * quantity
    return sum + itemCost
  }, 0)
  
  // Calculate net profit from unique orders (avoid double counting from multiple investors)
  // Net profit = total_price - (cost_per_piece × quantity) - payment_fees - delivery_fees
  const totalNetProfitFromOrders = Array.from(uniqueCompletedOrderIds).reduce((sum, orderId) => {
    const profit = completedOrders.find(p => p.order_id === orderId)
    if (!profit || !profit.orders) return sum
    
    const totalPrice = profit.orders.total_price || 0
    const costPerPiece = profit.orders.cost_per_piece ?? profit.cost_per_piece ?? 0
    const quantity = profit.orders.quantity || profit.quantity || 0
    const paymentFees = profit.orders.payment_fees || 0
    const deliveryFees = profit.orders.delivery_fees || 0
    
    // Calculate net profit for this order: total_price - (cost × qty) - fees
    const orderNetProfit = totalPrice - (costPerPiece * quantity) - paymentFees - deliveryFees
    return sum + orderNetProfit
  }, 0)

  

  // Calculate canceled order deductions (to show what was lost due to cancellations)
  // Using unique orders to avoid double counting
  const canceledRevenue = canceledOrders.reduce((sum, profit) => {
    if (profit.orders?.total_price) {
      return sum + profit.orders.total_price
    }
    // Fallback: calculate from gross_profit and cost
    const costPerPiece = profit.cost_per_piece || 0
    const quantity = profit.orders?.quantity || profit.quantity || 0
    const grossProfit = profit.gross_profit || 0
    return sum + (grossProfit + (costPerPiece * quantity))
  }, 0)
  
  const canceledDeductions = canceledOrders.reduce((sum, profit) => {
    const deliveryFees = profit.orders?.delivery_fees || 0
    const paymentFees = profit.orders?.payment_fees || 0
    return sum + deliveryFees + paymentFees
  }, 0)
  
  const canceledProductCosts = canceledOrders.reduce((sum, profit) => {
    // Try to get cost from profits table first, then fall back to order/product
    const costPerPiece = profit.cost_per_piece ?? profit.orders?.products?.cost_per_piece ?? 0
    const quantity = profit.orders?.quantity || profit.quantity || 0
    return sum + (costPerPiece * quantity)
  }, 0)
  
  // Calculate total business costs for the active date filter (default current month)
  const getFilterDateRange = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    switch (filters.dateFilter) {
      case 'today': {
        const start = new Date(today)
        const end = new Date(today)
        end.setHours(23, 59, 59, 999)
        return { start, end }
      }
      case 'week': {
        const end = new Date(today)
        end.setHours(23, 59, 59, 999)
        const start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        return { start, end }
      }
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        end.setHours(23, 59, 59, 999)
        return { start, end }
      }
      case 'lastMonth': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const end = new Date(now.getFullYear(), now.getMonth(), 0)
        end.setHours(23, 59, 59, 999)
        return { start, end }
      }
      case 'year': {
        const start = new Date(now.getFullYear(), 0, 1)
        const end = new Date(now.getFullYear(), 11, 31)
        end.setHours(23, 59, 59, 999)
        return { start, end }
      }
      case 'custom': {
        if (filters.customDateFrom && filters.customDateTo) {
          const start = new Date(filters.customDateFrom)
          const end = new Date(filters.customDateTo)
          end.setHours(23, 59, 59, 999)
          return { start, end }
        }
        return null
      }
      default:
        return null
    }
  }

  const expensesDateRange = getFilterDateRange()
  const expensesInRange = expenses.filter(expense => {
    if (!expensesDateRange) return true
    const expenseDate = new Date(expense.created_at)
    return expenseDate >= expensesDateRange.start && expenseDate <= expensesDateRange.end
  })

  const totalExpenses = expensesInRange.reduce((sum, expense) => sum + expense.amount, 0)
  
  // Calculate total orders amount excluding delivery fees, payment fees, and expenses
  const totalOrdersExcludingFeesAndExpenses = totalRevenue - totalOrderDeductions - totalExpenses
  
  // Net profit = sum of net profit from unique orders - expenses
  // This ensures we don't double count when multiple investors have profit records for the same order
  const netProfit = totalNetProfitFromOrders - totalExpenses
  
  // Calculate investor shares based on their percentage of net profit
  const shadyShare = netProfit * 0.8 // 80%
  const tamerShare = netProfit * 0.2 // 20%
  
  // Get investor details for expenses and shipments
  const shadyExpenses = expenses.filter(expense => expense.paid_by === '60c7d737-092a-46cb-a716-fd8f3a40dc1d')
  const tamerExpenses = expenses.filter(expense => expense.paid_by === 'ec524300-de3e-44a7-895e-3f5b5718cccf')
  const ordersAmountExpenses = expenses.filter(expense => expense.paid_by === 'orders_amount')
  const shadyShipments = shipments.filter(shipment => shipment.paid_by === '60c7d737-092a-46cb-a716-fd8f3a40dc1d')
  const tamerShipments = shipments.filter(shipment => shipment.paid_by === 'ec524300-de3e-44a7-895e-3f5b5718cccf')
  const ordersAmountShipments = shipments.filter(shipment => shipment.paid_by === 'orders_amount')
  
  // Calculate total amount shared for each investor (shipments + expenses)
  // This should match the calculation in shipments page exactly
  const shadyTotalShared = shadyExpenses.reduce((sum, exp) => sum + exp.amount, 0) + 
                           shadyShipments.reduce((sum, ship) => sum + ship.cost, 0)
  const tamerTotalShared = tamerExpenses.reduce((sum, exp) => sum + exp.amount, 0) + 
                           tamerShipments.reduce((sum, ship) => sum + ship.cost, 0)
  
  // Calculate orders amount paid expenses and shipments (deducted from orders revenue)
  const ordersAmountTotalExpenses = ordersAmountExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const ordersAmountTotalShipments = ordersAmountShipments.reduce((sum, ship) => sum + ship.cost, 0)
  const ordersAmountTotalPaid = ordersAmountTotalExpenses + ordersAmountTotalShipments
  
  // Calculate total amount for each investor (profit share + what they shared)
  const shadyTotalAmount = Math.max(0, shadyShare) + shadyTotalShared
  const tamerTotalAmount = Math.max(0, tamerShare) + tamerTotalShared



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'AED'
    }).format(amount)
  }

  const handleDownload = () => {
    // Prepare CSV data
    const headers = ['Order Number', 'Product', 'Sizes', 'Quantity', 'Total Price', 'Cost per Piece', 'Payment Fees', 'Delivery Fees', 'Status', 'Date']
    const rows = filteredProfits.map(profit => [
      profit.order_number,
      profit.product_name,
      profit.sizes,
      profit.quantity,
      profit.orders?.total_price || 0,
      profit.cost_per_piece || profit.orders?.products?.cost_per_piece || 0,
      profit.orders?.payment_fees || 0,
      profit.orders?.delivery_fees || 0,
      profit.orders?.status || '',
      new Date(profit.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    ])

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `profits_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
            <h1 className="text-2xl font-bold text-foreground">Profits</h1>
            <p className="text-muted-foreground">Track your profit distribution and performance</p>
          </div>
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </button>
        </div>

        {/* Date Filter */}
        <DateFilter
          dateFilter={filters.dateFilter}
          customDateFrom={filters.customDateFrom}
          customDateTo={filters.customDateTo}
          onFilterChange={handleFilterChange}
          totalCount={profits.length}
          filteredCount={filteredProfits.length}
        />

      {/* Orders Summary */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-xl font-semibold text-foreground mb-6">Orders Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Total Orders</h4>
            <p className="text-3xl font-bold text-foreground">{totalOrderNumbers.size}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed + Canceled</p>
          </div>
          
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Total Orders (Completed)</h4>
            <p className="text-3xl font-bold text-foreground">{completedOrderNumbers.size}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed only</p>
          </div>
          
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Total Pieces Sold</h4>
            <p className="text-3xl font-bold text-foreground">{totalPiecesSold}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed orders only</p>
          </div>

          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Total Orders Amount</h4>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed orders only</p>
          </div>
          
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Orders Amount excl. Fees</h4>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(totalOrdersExcludingFeesAndExpenses)}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed orders only</p>
          </div>
          
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Total Profit Amount</h4>
            <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netProfit)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              After deducting fees, expenses & costs
            </p>
          </div>
        </div>
      </div>
        
        {/* Detailed Profit Breakdown */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-medium text-foreground mb-3">Profit Calculation Breakdown</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Orders Amount (Completed):</span>
                <span className="font-medium text-green-600">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fees (Completed):</span>
                <span className="font-medium text-red-600">-{formatCurrency(totalOrderDeductions - completedOrders.reduce((sum, profit) => sum + (profit.orders?.payment_fees || 0), 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Fees (Completed):</span>
                <span className="font-medium text-red-600">-{formatCurrency(completedOrders.reduce((sum, profit) => sum + (profit.orders?.payment_fees || 0), 0))}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product Costs (Completed):</span>
                <span className="font-medium text-red-600">-{formatCurrency(totalProductCosts)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Business Expenses:</span>
                <span className="font-medium text-red-600">-{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium text-foreground">Net Profit:</span>
                <span className={`font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netProfit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Orders excl. Fees & Expenses:</span>
                <span className="font-medium text-foreground">{formatCurrency(totalOrdersExcludingFeesAndExpenses)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Canceled Orders Information */}
        {canceledOrderNumbers.size > 0 && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-3">Canceled Orders Impact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-red-700 dark:text-red-300">Total Orders Canceled:</span>
                  <span className="font-medium text-red-800 dark:text-red-200">{canceledOrderNumbers.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-700 dark:text-red-300">Total Pieces Canceled:</span>
                  <span className="font-medium text-red-800 dark:text-red-200">
                    {canceledOrders.reduce((sum, profit) => sum + (profit.orders?.quantity || profit.quantity || 0), 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-700 dark:text-red-300">Lost Revenue:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(canceledRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-700 dark:text-red-300">Lost Delivery Fees:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(canceledDeductions - canceledOrders.reduce((sum, profit) => sum + (profit.orders?.payment_fees || 0), 0))}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-red-700 dark:text-red-300">Lost Payment Fees:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(canceledOrders.reduce((sum, profit) => sum + (profit.orders?.payment_fees || 0), 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-700 dark:text-red-300">Lost Product Costs:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(canceledProductCosts)}</span>
                </div>
                <div className="flex justify-between border-t border-red-300 dark:border-red-700 pt-2">
                  <span className="font-medium text-red-800 dark:text-red-200">Total Lost Profit:</span>
                  <span className="font-bold text-red-600">
                    -{formatCurrency(canceledRevenue - canceledDeductions - canceledProductCosts)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
      {/* Investor Shared Amounts */}
        <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-xl font-semibold text-foreground mb-6">Investor Shared Amounts</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="text-center">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Shady's Total Shared Amount</h4>
            <p className="text-3xl font-bold text-blue-600">{formatCurrency(shadyTotalShared)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Shipments: {formatCurrency(shadyShipments.reduce((sum, ship) => sum + ship.cost, 0))} + 
              Expenses: {formatCurrency(shadyExpenses.reduce((sum, exp) => sum + exp.amount, 0))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {shadyShipments.length} shipments, {shadyExpenses.length} expenses
            </p>
        </div>
        
          <div className="text-center">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Tamer's Total Shared Amount</h4>
            <p className="text-3xl font-bold text-purple-600">{formatCurrency(tamerTotalShared)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Shipments: {formatCurrency(tamerShipments.reduce((sum, ship) => sum + ship.cost, 0))} + 
              Expenses: {formatCurrency(tamerExpenses.reduce((sum, exp) => sum + exp.amount, 0))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {tamerShipments.length} shipments, {tamerExpenses.length} expenses
            </p>
          </div>
        </div>
      </div>

      {/* Investor Profits */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-xl font-semibold text-foreground mb-6">Investor Profits</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="text-center">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Shady's Profit (80%)</h4>
            <p className="text-3xl font-bold text-blue-600">{formatCurrency(Math.max(0, shadyShare))}</p>
            <p className="text-sm text-muted-foreground mt-1">
              80% of total profit amount
            </p>
        </div>

          <div className="text-center">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Tamer's Profit (20%)</h4>
            <p className="text-3xl font-bold text-purple-600">{formatCurrency(Math.max(0, tamerShare))}</p>
            <p className="text-sm text-muted-foreground mt-1">
              20% of total profit amount
            </p>
          </div>
        </div>
      </div>

      {/* Exchanged Orders Summary */}
      {Object.keys(exchangedOrdersMap).length > 0 && (() => {
        // Process exchanged orders to extract all original and exchanged items
        const exchangedOrdersList = Object.entries(exchangedOrdersMap)
          .filter(([orderNumber, profits]) => {
            // Include only completed exchanged orders
            return profits.some(p => {
              const status = p.orders?.status
              return status === 'completed' || status === 'completed (exchanged)'
            })
          })
          .map(([orderNumber, profits]) => {
            // Get all completed exchanged orders for this order_number (can be multiple)
            const exchangedOrders = profits.filter(p => {
              const status = p.orders?.status
              return status === 'completed' || status === 'completed (exchanged)'
            })
            
            if (exchangedOrders.length === 0) return null
            
            // Parse original items from the first order's sizes field
            // Format: "NewProduct: NewSize; original size: Product1: Size1, Product2: Size2"
            const firstOrder = exchangedOrders[0]
            const sizes = firstOrder.orders?.sizes || firstOrder.sizes || ''
            
            // Extract original items
            const originalItems: Array<{ product: string; size: string }> = []
            if (sizes.includes('original size:')) {
              const parts = sizes.split('; original size:')
              const originalPart = parts[1]?.trim() || ''
              // Format: "Product1: Size1, Product2: Size2"
              if (originalPart) {
                const items = originalPart.split(',').map(item => item.trim())
                items.forEach(item => {
                  if (item.includes(':')) {
                    const [product, ...sizeParts] = item.split(':')
                    originalItems.push({
                      product: product.trim(),
                      size: sizeParts.join(':').trim()
                    })
                  } else {
                    originalItems.push({
                      product: 'Unknown',
                      size: item
                    })
                  }
                })
              }
            }
            
            // Extract exchanged items (all orders with this order_number)
            const exchangedItems = exchangedOrders.map(order => {
              const orderSizes = order.orders?.sizes || order.sizes || ''
              let exchangedSize = orderSizes
              if (orderSizes.includes('; original size:')) {
                const newSizePart = orderSizes.split('; original size:')[0] || orderSizes
                if (newSizePart.includes(':')) {
                  const newParts = newSizePart.split(':')
                  if (newParts.length >= 2) {
                    exchangedSize = newParts.slice(1).join(':').trim()
                  }
                } else {
                  exchangedSize = newSizePart.trim()
                }
              }
              
              return {
                product: order.product_name || 'Unknown',
                size: exchangedSize,
                quantity: order.orders?.quantity || order.quantity || 0,
                price: order.orders?.total_price || 0
              }
            })
            
            // Calculate totals
            const originalTotalPrice = originalItems.reduce((sum, item, idx) => {
              // We don't have original prices, so we'll estimate from exchanged items
              // or show 0
              return sum + 0
            }, 0)
            
            const exchangedTotalPrice = exchangedItems.reduce((sum, item) => sum + item.price, 0)
            const exchangedTotalQty = exchangedItems.reduce((sum, item) => sum + item.quantity, 0)
            const originalTotalQty = originalItems.length // We don't have original quantities stored
            
            return {
              orderNumber: parseInt(orderNumber),
              originalItems: originalItems,
              exchangedItems: exchangedItems,
              originalTotalQty: originalTotalQty,
              exchangedTotalQty: exchangedTotalQty,
              originalTotalPrice: originalTotalPrice,
              exchangedTotalPrice: exchangedTotalPrice,
              priceDifference: exchangedTotalPrice - originalTotalPrice
            }
          })
          .filter((order): order is NonNullable<typeof order> => order !== null && order !== undefined)
        
        return (
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-xl font-semibold text-foreground mb-6">Exchanged Orders Summary</h3>
            <p className="text-sm text-muted-foreground mb-4">Details of orders that were exchanged (Completed orders only, from December 2025 onwards when exchange feature was implemented)</p>
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-semibold text-foreground">Order #</th>
                    <th className="text-left p-2 font-semibold text-foreground">Original Items</th>
                    <th className="text-left p-2 font-semibold text-foreground">Exchanged Items</th>
                    <th className="text-right p-2 font-semibold text-foreground">Original Total</th>
                    <th className="text-right p-2 font-semibold text-foreground">Exchanged Total</th>
                    <th className="text-right p-2 font-semibold text-foreground">Price Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {exchangedOrdersList.map((order) => {
                    const maxRows = Math.max(order.originalItems.length, order.exchangedItems.length)
                    return Array.from({ length: maxRows }).map((_, rowIndex) => (
                      <tr key={`${order.orderNumber}-${rowIndex}`} className="border-b border-border/50 hover:bg-muted/30">
                        {rowIndex === 0 && (
                          <td className="p-2 text-foreground font-medium" rowSpan={maxRows || 1}>
                            #{order.orderNumber || 'N/A'}
                          </td>
                        )}
                        <td className="p-2 text-foreground">
                          {order.originalItems[rowIndex] ? (
                            <>
                              <div className="font-medium">{order.originalItems[rowIndex].product}</div>
                              <div className="text-xs text-orange-600 dark:text-orange-400">
                                Size: {order.originalItems[rowIndex].size}
                              </div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-2 text-foreground">
                          {order.exchangedItems[rowIndex] ? (
                            <>
                              <div className="font-medium">{order.exchangedItems[rowIndex].product}</div>
                              <div className="text-xs text-muted-foreground">
                                Size: {order.exchangedItems[rowIndex].size} | Qty: {order.exchangedItems[rowIndex].quantity}
                              </div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        {rowIndex === 0 && (
                          <>
                            <td className="p-2 text-right text-foreground" rowSpan={maxRows || 1}>
                              {order.originalTotalPrice > 0 ? formatCurrency(order.originalTotalPrice) : 'N/A'}
                            </td>
                            <td className="p-2 text-right text-foreground" rowSpan={maxRows || 1}>
                              {formatCurrency(order.exchangedTotalPrice)}
                            </td>
                            <td className={`p-2 text-right font-medium ${order.priceDifference >= 0 ? 'text-green-600' : 'text-red-600'}`} rowSpan={maxRows || 1}>
                              {order.priceDifference >= 0 ? '+' : ''}{formatCurrency(order.priceDifference)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {exchangedOrdersList.map((order, index) => (
                <div key={order.orderNumber || `order-${index}`} className={`p-4 ${index < exchangedOrdersList.length - 1 ? 'border-b-2 border-blue-200 dark:border-blue-800 mb-4' : ''}`}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-foreground">Order #{order.orderNumber || 'N/A'}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.priceDifference >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {order.priceDifference >= 0 ? '+' : ''}{formatCurrency(order.priceDifference)}
                    </span>
                  </div>
                  
                  <div className="space-y-4 text-sm">
                    {/* Original Items */}
                    <div>
                      <h4 className="font-medium text-orange-600 dark:text-orange-400 mb-2">Original Items:</h4>
                      {order.originalItems.length > 0 ? (
                        <div className="space-y-2">
                          {order.originalItems.map((item, idx) => (
                            <div key={idx} className="pl-2 border-l-2 border-orange-300">
                              <div className="font-medium">{item.product}</div>
                              <div className="text-xs text-muted-foreground">Size: {item.size}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">N/A</p>
                      )}
                    </div>
                    
                    {/* Exchanged Items */}
                    <div>
                      <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">Exchanged Items:</h4>
                      <div className="space-y-2">
                        {order.exchangedItems.map((item, idx) => (
                          <div key={idx} className="pl-2 border-l-2 border-green-300">
                            <div className="font-medium">{item.product}</div>
                            <div className="text-xs text-muted-foreground">
                              Size: {item.size} | Qty: {item.quantity} | Price: {formatCurrency(item.price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Totals */}
                    <div className="pt-2 border-t border-border">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Original Total:</span>
                        <span className="font-medium">
                          {order.originalTotalPrice > 0 ? formatCurrency(order.originalTotalPrice) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Exchanged Total:</span>
                        <span className="font-medium">{formatCurrency(order.exchangedTotalPrice)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Total Exchanged Orders:</strong> {exchangedOrdersList.length}
              </p>
            </div>
          </div>
        )
      })()}

      {/* Product Sales Breakdown - Completed Orders Only */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-xl font-semibold text-foreground mb-6">Product Sales Breakdown</h3>
        <p className="text-sm text-muted-foreground mb-4">Quantity sold per product (Completed orders only, exchanges included)</p>
        {(() => {
          // Handle exchanges: Group by order_number and take the most recent order (highest order_id)
          // This ensures if an order was exchanged, we count the exchanged product, not the original
          const ordersByOrderNumber = completedOrders.reduce((acc, profit) => {
            const orderNumber = profit.order_number || profit.orders?.order_number
            if (!orderNumber) return acc
            
            const orderId = parseInt(profit.order_id) || 0
            const existing = acc[orderNumber]
            
            // If no existing order for this order_number, or this order_id is higher (more recent), use this one
            if (!existing || orderId > (parseInt(existing.order_id) || 0)) {
              acc[orderNumber] = profit
            }
            
            return acc
          }, {} as Record<number, Profit>)
          
          // Get the final orders (after handling exchanges)
          const finalOrders = Object.values(ordersByOrderNumber)
          
          // Group by product name and sum quantities (combine exchanged and non-exchanged for same product)
          const productSales = finalOrders.reduce((acc, profit) => {
            const productName = profit.product_name || 'Unknown Product'
            const quantity = profit.orders?.quantity || profit.quantity || 0
            
            // Use product name as key (don't separate exchanged products)
            if (!acc[productName]) {
              acc[productName] = {
                name: productName,
                totalQuantity: 0,
                totalRevenue: 0
              }
            }
            
            acc[productName].totalQuantity += quantity
            acc[productName].totalRevenue += profit.orders?.total_price || 0
            
            return acc
          }, {} as Record<string, { name: string; totalQuantity: number; totalRevenue: number }>)
          
          const productSalesArray = Object.values(productSales).sort((a, b) => b.totalQuantity - a.totalQuantity)
          
          if (productSalesArray.length === 0) {
            return (
              <p className="text-muted-foreground text-center py-4">No completed orders found for the selected period.</p>
            )
          }
          
          return (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 font-semibold text-foreground">Product Name</th>
                      <th className="text-right p-2 font-semibold text-foreground">Quantity Sold</th>
                      <th className="text-right p-2 font-semibold text-foreground">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productSalesArray.map((product, index) => (
                      <tr key={index} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="p-2 text-foreground">
                          {product.name}
                        </td>
                        <td className="p-2 text-right font-medium text-foreground">{product.totalQuantity}</td>
                        <td className="p-2 text-right font-medium text-foreground">{formatCurrency(product.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border font-bold">
                      <td className="p-2 text-foreground">Total</td>
                      <td className="p-2 text-right text-foreground">{totalPiecesSold}</td>
                      <td className="p-2 text-right text-foreground">{formatCurrency(totalRevenue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {productSalesArray.map((product, index) => (
                  <div key={index} className={`p-4 ${index < productSalesArray.length - 1 ? 'border-b-2 border-blue-200 dark:border-blue-800 mb-4' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{product.name}</h3>
                      </div>
                      <span className="text-lg font-bold text-green-600">{formatCurrency(product.totalRevenue)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Quantity Sold: </span>
                      <span className="font-medium text-foreground">{product.totalQuantity}</span>
                    </div>
                  </div>
                ))}
                <div className="p-4 bg-muted/30 rounded-lg border-t-2 border-border">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground">Total</span>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{totalPiecesSold} pieces</p>
                      <p className="font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )
        })()}
      </div>

    </div>
  )
}

