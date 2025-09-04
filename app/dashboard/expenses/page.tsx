'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, DollarSign, Calendar, Tag } from 'lucide-react'

interface Expense {
  id: string
  details: string
  amount: number
  paid_by: string
  investor_name?: string
  created_at: string
  updated_at: string
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [formData, setFormData] = useState({
    details: '',
    amount: 0,
    paid_by: ''
  })
  const supabase = createClient()

  const [investors, setInvestors] = useState<{id: string, name: string}[]>([])

  useEffect(() => {
    fetchExpenses()
    fetchInvestors()
  }, [])

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          investors (
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const transformedExpenses = data.map(expense => ({
        ...expense,
        investor_name: expense.investors?.name || 'Unknown'
      }))
      
      setExpenses(transformedExpenses)
    } catch (error) {
      console.error('Error fetching expenses:', error)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update({
            details: formData.details,
            amount: formData.amount,
            paid_by: formData.paid_by
          })
          .eq('id', editingExpense.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert({
            details: formData.details,
            amount: formData.amount,
            paid_by: formData.paid_by
          })

        if (error) throw error
      }

      setShowAddModal(false)
      setEditingExpense(null)
      resetForm()
      fetchExpenses()
    } catch (error) {
      console.error('Error saving expense:', error)
    }
  }

  const handleDelete = async (expenseId: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', expenseId)

        if (error) throw error
        fetchExpenses()
      } catch (error) {
        console.error('Error deleting expense:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      details: '',
      amount: 0,
      paid_by: ''
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your business expenses and costs</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Expenses</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">AED {totalExpenses.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Tag className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Records</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{expenses.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">This Month</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">
                AED {expenses
                  .filter(expense => {
                    const expenseDate = new Date(expense.created_at)
                    const now = new Date()
                    return expenseDate.getMonth() === now.getMonth() && 
                           expenseDate.getFullYear() === now.getFullYear()
                  })
                  .reduce((sum, expense) => sum + expense.amount, 0)
                  .toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Investor Expense Summary */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          Expenses by Investor
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {investors.map(investor => {
            const investorExpenses = expenses.filter(expense => expense.paid_by === investor.id)
            const totalAmount = investorExpenses.reduce((sum, expense) => sum + expense.amount, 0)
            
            return (
              <div key={investor.id} className="bg-muted/30 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-foreground">{investor.name}</h4>
                    <p className="text-sm text-muted-foreground">{investorExpenses.length} expenses</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">AED {totalAmount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {totalExpenses > 0 ? ((totalAmount / totalExpenses) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Expenses Display */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {/* Mobile Card View */}
        <div className="block lg:hidden">
          {expenses.map((expense, index) => (
            <div key={expense.id} className={`p-4 ${index < expenses.length - 1 ? 'border-b-2 border-red-200 dark:border-red-800 mb-4' : ''}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{expense.details}</h3>
                  <p className="text-sm text-muted-foreground">Paid by: {expense.investor_name}</p>
                </div>
                <span className="font-medium text-red-600 dark:text-red-400">
                  -AED {expense.amount.toFixed(2)}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>{formatDate(expense.created_at)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingExpense(expense)
                      setFormData({
                        details: expense.details,
                        amount: expense.amount,
                        paid_by: expense.paid_by
                      })
                      setShowAddModal(true)
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Paid By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Amount
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
              {expenses.map((expense, index) => (
                <tr key={expense.id} className={`hover:bg-muted/30 ${index < expenses.length - 1 ? 'border-b-2 border-red-200 dark:border-red-800' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-muted-foreground mr-2" />
                      <span className="text-sm font-medium text-foreground">
                        {expense.details}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      {expense.investor_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    <span className="font-medium text-red-600 dark:text-red-400">
                      -AED {expense.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                      {formatDate(expense.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingExpense(expense)
                          setFormData({
                            details: expense.details,
                            amount: expense.amount,
                            paid_by: expense.paid_by
                          })
                          setShowAddModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-800"
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
        
        {expenses.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No expenses</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started by adding your first expense.
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Details
                  </label>
                  <input
                    type="text"
                    value={formData.details}
                    onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                    placeholder="Enter expense details"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-muted-foreground">AED</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-12 pr-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      placeholder="0.00"
                      required
                    />
                  </div>
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
                    <option value="">Select an investor</option>
                    {investors.map((investor) => (
                      <option key={investor.id} value={investor.id}>
                        {investor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    {editingExpense ? 'Update Expense' : 'Create Expense'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setEditingExpense(null)
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
