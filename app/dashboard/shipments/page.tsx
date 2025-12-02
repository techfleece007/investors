'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, Truck, Package, CheckCircle, Clock, XCircle, X } from 'lucide-react'
import DateFilter from '@/components/DateFilter'

interface Shipment {
  id: string
  name: string
  cost: number
  details: string
  paid_by: string
  investor_name?: string
  date: string
  tracking_number: string
  destination: string
  status: 'pending' | 'shipped' | 'delivered'
  created_at: string
  updated_at: string
}

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  shipped: { label: 'Shipped', icon: Truck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  delivered: { label: 'Delivered', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' }
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [filters, setFilters] = useState({
    dateFilter: 'month' as 'all' | 'today' | 'week' | 'month' | 'year' | 'custom',
    customDateFrom: '',
    customDateTo: ''
  })
  const [formData, setFormData] = useState({
    name: '',
    cost: 0,
    details: '',
    paid_by: '',
    date: new Date().toISOString().split('T')[0],
    tracking_number: '',
    destination: '',
    status: 'pending' as 'pending' | 'shipped' | 'delivered'
  })
  const [shipmentItems, setShipmentItems] = useState<Array<{
    product_variant_id: string,
    quantity: number,
    cost_per_piece: number,
    price: number
  }>>([])
  const [investors, setInvestors] = useState<{id: string, name: string}[]>([])
  const [productVariants, setProductVariants] = useState<Array<{
    id: string,
    product_id: string,
    size: string,
    quantity: number,
    price: number,
    cost: number,
    products?: { name: string }
  }>>([])
  const supabase = createClient()
  
  // Size order for sorting
  const SIZE_ORDER = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']
  
  const sortVariantsBySize = <T extends { size: string }>(variants: T[]): T[] => {
    return [...variants].sort((a, b) => {
      const indexA = SIZE_ORDER.indexOf(a.size.toUpperCase())
      const indexB = SIZE_ORDER.indexOf(b.size.toUpperCase())
      const orderA = indexA === -1 ? SIZE_ORDER.length : indexA
      const orderB = indexB === -1 ? SIZE_ORDER.length : indexB
      return orderA - orderB
    })
  }

  useEffect(() => {
    fetchShipments()
    fetchInvestors()
    fetchProductVariants()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [shipments, filters])

  const fetchShipments = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          investors (
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const transformedShipments = data.map(shipment => ({
        ...shipment,
        investor_name: shipment.paid_by === 'orders_amount' 
          ? 'Orders Amount' 
          : (shipment.investors?.name || 'Unknown')
      }))
      
      setShipments(transformedShipments)
    } catch (error) {
      console.error('Error fetching shipments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInvestors = async () => {
    try {
      const { data, error } = await supabase
        .from('investors')
        .select('id, name')
        .order('name')

      if (error) throw error
      setInvestors(data)
    } catch (error) {
      console.error('Error fetching investors:', error)
    }
  }

  const fetchProductVariants = async () => {
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          *,
          products (
            name
          )
        `)
        .order('product_id, size')

      if (error) throw error
      setProductVariants(data)
    } catch (error) {
      console.error('Error fetching product variants:', error)
    }
  }

  const applyFilters = () => {
    let filtered = [...shipments]

    // Filter by date
    if (filters.dateFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      filtered = filtered.filter(shipment => {
        const shipmentDate = new Date(shipment.created_at)
        
        switch (filters.dateFilter) {
          case 'today':
            return shipmentDate >= today
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            return shipmentDate >= weekAgo
          case 'month':
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
            endOfMonth.setHours(23, 59, 59, 999)
            return shipmentDate >= startOfMonth && shipmentDate <= endOfMonth
          case 'year':
            const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)
            return shipmentDate >= yearAgo
          case 'custom':
            if (filters.customDateFrom && filters.customDateTo) {
              const fromDate = new Date(filters.customDateFrom)
              const toDate = new Date(filters.customDateTo)
              toDate.setHours(23, 59, 59, 999) // Include the entire end date
              return shipmentDate >= fromDate && shipmentDate <= toDate
            }
            return true
          default:
            return true
        }
      })
    }

    setFilteredShipments(filtered)
  }

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingShipment) {
        const { error } = await supabase
          .from('shipments')
          .update({
            name: formData.name,
            cost: formData.cost,
            details: formData.details,
            paid_by: formData.paid_by,
            date: formData.date,
            tracking_number: formData.tracking_number,
            destination: formData.destination,
            status: formData.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingShipment.id)

        if (error) throw error
      } else {
        // Create shipment
        const { data: shipmentData, error: shipmentError } = await supabase
          .from('shipments')
          .insert({
            name: formData.name,
            cost: formData.cost,
            details: formData.details,
            paid_by: formData.paid_by,
            date: formData.date,
            tracking_number: formData.tracking_number,
            destination: formData.destination,
            status: formData.status
          })
          .select('id')
          .single()

        if (shipmentError) throw shipmentError

        // Create variant_shipments records for each item
        if (shipmentItems.length > 0) {
          const variantShipmentsData = shipmentItems.map(item => ({
            product_variant_id: parseInt(item.product_variant_id),
            shipment_id: shipmentData.id,
            quantity: item.quantity,
            cost_per_piece: item.cost_per_piece
            // Note: price is stored in product_variants table, not variant_shipments
          }))

          const { data: variantShipmentsResult, error: variantError } = await supabase
            .from('variant_shipments')
            .insert(variantShipmentsData)
            .select()

          if (variantError) {
            console.error('Error inserting variant_shipments:', variantError)
            throw variantError
          }

          // Update product_variants with new quantities, calculate weighted average cost, and update price if provided
          for (const item of shipmentItems) {
            const variant = productVariants.find(v => v.id === item.product_variant_id)
            if (variant) {
              // Calculate weighted average cost from all variant_shipments
              const { data: allShipments, error: shipmentsError } = await supabase
                .from('variant_shipments')
                .select('quantity, cost_per_piece')
                .eq('product_variant_id', item.product_variant_id)

              let weightedAvgCost = item.cost_per_piece
              if (!shipmentsError && allShipments && allShipments.length > 0) {
                // Calculate weighted average: sum(quantity * cost) / sum(quantity)
                const totalCost = allShipments.reduce((sum, s) => sum + (s.quantity * s.cost_per_piece), 0)
                const totalQuantity = allShipments.reduce((sum, s) => sum + s.quantity, 0)
                weightedAvgCost = totalQuantity > 0 ? totalCost / totalQuantity : item.cost_per_piece
              }

              // Prepare update data
              const updateData: any = {
                quantity: variant.quantity + item.quantity,
                cost: weightedAvgCost, // Use weighted average cost from all shipments
                shipment_id: shipmentData.id
              }

              // Update price if provided (new sell price for this stock)
              if (item.price && item.price > 0) {
                updateData.price = item.price
              }

              await supabase
                .from('product_variants')
                .update(updateData)
                .eq('id', item.product_variant_id)
            }
          }
        }
      }

      setShowSuccess(true)
      setSuccessMessage(editingShipment ? 'Shipment updated successfully!' : 'Shipment created successfully!')
      setShowAddModal(false)
      setEditingShipment(null)
      resetForm()
      fetchShipments()
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving shipment:', error)
    }
  }

  const handleDelete = async (shipmentId: string) => {
    if (confirm('Are you sure you want to delete this shipment?')) {
      try {
        const { error } = await supabase
          .from('shipments')
          .delete()
          .eq('id', shipmentId)

        if (error) throw error
        fetchShipments()
      } catch (error) {
        console.error('Error deleting shipment:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      cost: 0,
      details: '',
      paid_by: '',
      date: new Date().toISOString().split('T')[0],
      tracking_number: '',
      destination: '',
      status: 'pending'
    })
    setShipmentItems([])
  }

  const addShipmentItem = () => {
    setShipmentItems(prev => [...prev, {
      product_variant_id: '',
      quantity: 0,
      cost_per_piece: 0,
      price: 0
    }])
  }

  const removeShipmentItem = (index: number) => {
    setShipmentItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateShipmentItem = (index: number, field: string, value: string | number) => {
    setShipmentItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      
      // When variant is selected, pre-fill price and cost if not already set
      if (field === 'product_variant_id' && value) {
        const variant = productVariants.find(v => v.id === value)
        if (variant) {
          // Pre-fill cost if not set, otherwise keep user's input
          if (!updated[index].cost_per_piece || updated[index].cost_per_piece === 0) {
            updated[index].cost_per_piece = variant.cost || 0
          }
          // Pre-fill price if not set, otherwise keep user's input
          if (!updated[index].price || updated[index].price === 0) {
            updated[index].price = variant.price || 0
          }
        }
      }
      
      return updated
    })
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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Shipments</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your shipment status and delivery</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Shipment
        </button>
      </div>

      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in slide-in-from-right-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-4" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Investor Shipment Summary */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Truck className="h-5 w-5 mr-2" />
          Shipment Costs by Payer
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {investors.map(investor => {
            const investorShipments = shipments.filter(shipment => shipment.paid_by === investor.id)
            const totalAmount = investorShipments.reduce((sum, shipment) => sum + shipment.cost, 0)
            
            return (
              <div key={investor.id} className="bg-muted/30 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-foreground">{investor.name}</h4>
                    <p className="text-sm text-muted-foreground">{investorShipments.length} shipments</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">AED {totalAmount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {shipments.reduce((sum, s) => sum + s.cost, 0) > 0 ? 
                        ((totalAmount / shipments.reduce((sum, s) => sum + s.cost, 0)) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Shipments Display */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {/* Date Filter */}
        <DateFilter
          dateFilter={filters.dateFilter}
          customDateFrom={filters.customDateFrom}
          customDateTo={filters.customDateTo}
          onFilterChange={handleFilterChange}
          totalCount={shipments.length}
          filteredCount={filteredShipments.length}
        />
        {/* Mobile Card View */}
        <div className="block lg:hidden">
          {filteredShipments.map((shipment, index) => {
            const status = statusConfig[shipment.status]
            const StatusIcon = status.icon
            
            return (
              <div key={shipment.id} className={`p-4 ${index < filteredShipments.length - 1 ? 'border-b-2 border-green-200 dark:border-green-800 mb-4' : ''}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{shipment.name}</h3>
                    <p className="text-sm text-muted-foreground">Tracking: {shipment.tracking_number}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                    <StatusIcon className="mr-1.5 h-3 w-3" />
                    {status.label}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground">Destination:</span>
                      <span className="ml-1 font-medium">{shipment.destination}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="ml-1 font-medium text-green-600">AED {shipment.cost.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground">Paid by:</span>
                      <span className="ml-1 font-medium">{shipment.investor_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <span className="ml-1 font-medium">{new Date(shipment.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {shipment.details && (
                    <div>
                      <span className="text-muted-foreground">Details:</span>
                      <span className="ml-1 font-medium">{shipment.details}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Created: {formatDate(shipment.created_at)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingShipment(shipment)
                          setFormData({
                            name: shipment.name,
                            cost: shipment.cost,
                            details: shipment.details,
                            paid_by: shipment.paid_by,
                            date: shipment.date,
                            tracking_number: shipment.tracking_number,
                            destination: shipment.destination,
                            status: shipment.status
                          })
                          setShowAddModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(shipment.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tracking #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Destination
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Paid By
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
              {filteredShipments.map((shipment, index) => {
                const status = statusConfig[shipment.status]
                const StatusIcon = status.icon
                
                return (
                  <tr key={shipment.id} className={`hover:bg-muted/30 ${index < filteredShipments.length - 1 ? 'border-b-2 border-green-200 dark:border-green-800' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="h-5 w-5 text-muted-foreground mr-2" />
                        <span className="text-sm font-medium text-foreground">
                          {shipment.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-mono">
                      {shipment.tracking_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {shipment.destination}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <span className="font-medium text-green-600">AED {shipment.cost.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {shipment.investor_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                        <StatusIcon className="mr-1.5 h-3 w-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(shipment.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingShipment(shipment)
                            setFormData({
                              name: shipment.name,
                              cost: shipment.cost,
                              details: shipment.details,
                              paid_by: shipment.paid_by,
                              date: shipment.date,
                              tracking_number: shipment.tracking_number,
                              destination: shipment.destination,
                              status: shipment.status
                            })
                            setShowAddModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(shipment.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {filteredShipments.length === 0 && (
          <div className="text-center py-12">
            <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No shipments</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started by adding your first shipment.
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowAddModal(false)
            setEditingShipment(null)
            resetForm()
          }}
        >
          <div 
            className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-2 sm:mx-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">
                {editingShipment ? 'Edit Shipment' : 'Add New Shipment'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingShipment(null)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      placeholder="Enter shipment name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Cost
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-muted-foreground">AED</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost}
                        onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                        className="w-full pl-12 pr-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Details
                    </label>
                    <input
                      type="text"
                      value={formData.details}
                      onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      placeholder="Enter shipment details (e.g., quantity, items)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Paid By
                    </label>
                    <select
                      value={formData.paid_by}
                      onChange={(e) => setFormData(prev => ({ ...prev, paid_by: e.target.value }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      required
                    >
                      <option value="">Select who paid</option>
                      <option value="orders_amount">Orders Amount</option>
                      {investors.map((investor) => (
                        <option key={investor.id} value={investor.id}>
                          {investor.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tracking Number
                    </label>
                    <input
                      type="text"
                      value={formData.tracking_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, tracking_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      placeholder="Enter tracking number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Destination
                    </label>
                    <input
                      type="text"
                      value={formData.destination}
                      onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      placeholder="Enter destination address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'pending' | 'shipped' | 'delivered' }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      required
                    >
                      <option value="pending">Pending</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                </div>

                {/* Shipment Items Section */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-foreground">
                      Shipment Items (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={addShipmentItem}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add Product Variant
                    </button>
                  </div>
                  
                  {shipmentItems.length > 0 && (
                    <div className="space-y-3">
                      {shipmentItems.map((item, index) => (
                        <div key={index} className="border border-border rounded-md p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Product Variant
                              </label>
                              <select
                                value={item.product_variant_id}
                                onChange={(e) => updateShipmentItem(index, 'product_variant_id', e.target.value)}
                                className="w-full px-3 py-2 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                              >
                                <option value="">Select Variant</option>
                                {sortVariantsBySize(productVariants).map((variant) => (
                                  <option key={variant.id} value={variant.id}>
                                    {variant.products?.name} - {variant.size}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Quantity
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={item.quantity}
                                onChange={(e) => updateShipmentItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                                placeholder="0"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Cost per Piece
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.cost_per_piece}
                                onChange={(e) => updateShipmentItem(index, 'cost_per_piece', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                                placeholder="0.00"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Sell Price (Optional)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.price || ''}
                                onChange={(e) => updateShipmentItem(index, 'price', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                                placeholder="0.00"
                              />
                            </div>
                            
                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() => removeShipmentItem(index)}
                                className="w-full px-3 py-2 text-red-600 hover:bg-red-100 rounded text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {shipmentItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="mx-auto h-8 w-8 mb-2" />
                      <p>No product variants added to this shipment</p>
                      <p className="text-sm">Click "Add Product Variant" to track inventory</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    {editingShipment ? 'Update Shipment' : 'Create Shipment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setEditingShipment(null)
                      resetForm()
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
