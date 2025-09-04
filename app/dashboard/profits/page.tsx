'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, DollarSign } from 'lucide-react'

interface Profit {
  id: string
  order_id: string
  investor_id: string
  gross_profit: number
  net_profit: number
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
    products?: {
      name: string
      cost_per_piece: number
    }
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function ProfitsPage() {
  const [profits, setProfits] = useState<Profit[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [shipments, setShipments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchProfits()
    fetchExpenses()
    fetchShipments()
  }, [])

  const fetchProfits = async () => {
    try {
      // Fetch orders directly instead of profits table
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
              products (
            name,
            cost_per_piece
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Transform orders data to match the expected format
      const transformedProfits = ordersData.map(order => ({
        id: `order-${order.id}`,
        order_id: order.id,
        investor_id: 'shady', // We'll calculate this based on the order
        gross_profit: 0, // Not used in our calculation
        net_profit: 0, // Not used in our calculation
        created_at: order.created_at,
        product_name: order.products?.name || 'Unknown Product',
        sizes: order.sizes || 'Unknown Size',
        quantity: order.quantity || 0,
        order_number: order.order_number || 0,
        investor_name: 'Unknown Investor', // Not used in our calculation
        orders: {
          product_id: order.product_id,
          sizes: order.sizes,
          quantity: order.quantity,
          order_number: order.order_number,
          total_price: order.total_price,
          status: order.status,
          delivery_fees: order.delivery_fees,
          payment_fees: order.payment_fees,
          products: {
            name: order.products?.name,
            cost_per_piece: order.products?.cost_per_piece
          }
        }
      }))

      setProfits(transformedProfits)
    } catch (error) {
      console.error('Error fetching orders:', error)
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

  // Group orders by order_number to count unique orders
  const uniqueOrders = profits.reduce((acc, profit) => {
    const orderNumber = profit.orders?.order_number
    if (orderNumber && !acc[orderNumber]) {
      acc[orderNumber] = profit.orders
    }
      return acc
  }, {} as Record<number, any>)

  // Calculate total revenue from completed orders
  const totalRevenue = profits.reduce((sum, profit) => {
    return sum + (profit.orders?.total_price || 0)
  }, 0)
  
  // Calculate total pieces sold
  const totalPiecesSold = profits.reduce((sum, profit) => {
    return sum + (profit.orders?.quantity || 0)
  }, 0)
  
  // Calculate total deductions from orders (delivery fees + payment fees)
  const totalOrderDeductions = profits.reduce((sum, profit) => {
    const deliveryFees = profit.orders?.delivery_fees || 0
    const paymentFees = profit.orders?.payment_fees || 0
    return sum + deliveryFees + paymentFees
  }, 0)
  
  // Calculate total product costs (cost per piece × quantity sold)
  const totalProductCosts = profits.reduce((sum, profit) => {
    const costPerPiece = profit.orders?.products?.cost_per_piece || 0
    return sum + (costPerPiece * (profit.orders?.quantity || 0))
  }, 0)
  
  // Calculate total business costs (expenses only - shipments are for inventory, not profit calculation)
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  
  // Calculate net profit: Total Orders Amount - Delivery Fees - Payment Fees - Product Costs - Expenses
  const netProfit = totalRevenue - totalOrderDeductions - totalProductCosts - totalExpenses
  
  // Calculate investor shares based on their percentage of net profit
  const shadyShare = netProfit * 0.8 // 80%
  const tamerShare = netProfit * 0.2 // 20%
  
  // Get investor details for expenses and shipments
  const shadyExpenses = expenses.filter(expense => expense.paid_by === '60c7d737-092a-46cb-a716-fd8f3a40dc1d')
  const tamerExpenses = expenses.filter(expense => expense.paid_by === 'ec524300-de3e-44a7-895e-3f5b5718cccf')
  const shadyShipments = shipments.filter(shipment => shipment.paid_by === '60c7d737-092a-46cb-a716-fd8f3a40dc1d')
  const tamerShipments = shipments.filter(shipment => shipment.paid_by === 'ec524300-de3e-44a7-895e-3f5b5718cccf')
  
  // Calculate total amount shared for each investor (shipments + expenses)
  // This should match the calculation in shipments page exactly
  const shadyTotalShared = shadyExpenses.reduce((sum, exp) => sum + exp.amount, 0) + 
                           shadyShipments.reduce((sum, ship) => sum + ship.cost, 0)
  const tamerTotalShared = tamerExpenses.reduce((sum, exp) => sum + exp.amount, 0) + 
                           tamerShipments.reduce((sum, ship) => sum + ship.cost, 0)
  
  // Calculate total amount for each investor (profit share + what they shared)
  const shadyTotalAmount = Math.max(0, shadyShare) + shadyTotalShared
  const tamerTotalAmount = Math.max(0, tamerShare) + tamerTotalShared



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'AED'
    }).format(amount)
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
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profits</h1>
          <p className="text-muted-foreground">Track your profit distribution and performance</p>
        </div>

      {/* Orders Summary */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-xl font-semibold text-foreground mb-6">Orders Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Total Orders</h4>
            <p className="text-3xl font-bold text-foreground">{Object.keys(uniqueOrders).length}</p>
        </div>
          
          <div className="text-center">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Total Pieces Sold</h4>
            <p className="text-3xl font-bold text-foreground">{totalPiecesSold}</p>
      </div>

          <div className="text-center">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Total Orders Amount</h4>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
            </div>
          
          <div className="text-center">
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
                <span className="text-muted-foreground">Total Orders Amount:</span>
                <span className="font-medium text-green-600">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fees:</span>
                <span className="font-medium text-red-600">-{formatCurrency(profits.reduce((sum, profit) => sum + (profit.orders?.delivery_fees || 0), 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Fees:</span>
                <span className="font-medium text-red-600">-{formatCurrency(profits.reduce((sum, profit) => sum + (profit.orders?.payment_fees || 0), 0))}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product Costs:</span>
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
            </div>
          </div>
        </div>
        
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
              Debug: {shadyShipments.length} shipments, {shadyExpenses.length} expenses
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
              Debug: {tamerShipments.length} shipments, {tamerExpenses.length} expenses
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


    </div>
  )
}

