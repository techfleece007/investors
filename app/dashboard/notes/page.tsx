'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, FileText, Calendar, Hash, X } from 'lucide-react'
import DateFilter from '@/components/DateFilter'

interface Note {
  id: string
  details: string
  reference_number: string
  date: string
  created_at: string
  updated_at: string
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [filters, setFilters] = useState({
    dateFilter: 'all' as 'all' | 'today' | 'week' | 'month' | 'year' | 'custom',
    customDateFrom: '',
    customDateTo: ''
  })
  const [formData, setFormData] = useState({
    details: '',
    reference_number: '',
    date: new Date().toISOString().split('T')[0]
  })
  const supabase = createClient()

  useEffect(() => {
    fetchNotes()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [notes, filters])

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...notes]

    // Filter by date
    if (filters.dateFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      filtered = filtered.filter(note => {
        const noteDate = new Date(note.date)
        
        switch (filters.dateFilter) {
          case 'today':
            return noteDate >= today
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            return noteDate >= weekAgo
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
            return noteDate >= monthAgo
          case 'year':
            const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)
            return noteDate >= yearAgo
          case 'custom':
            if (filters.customDateFrom && filters.customDateTo) {
              const fromDate = new Date(filters.customDateFrom)
              const toDate = new Date(filters.customDateTo)
              toDate.setHours(23, 59, 59, 999) // Include the entire end date
              return noteDate >= fromDate && noteDate <= toDate
            }
            return true
          default:
            return true
        }
      })
    }

    setFilteredNotes(filtered)
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
      if (editingNote) {
        const { error } = await supabase
          .from('notes')
          .update({
            details: formData.details,
            reference_number: formData.reference_number,
            date: formData.date
          })
          .eq('id', editingNote.id)

        if (error) throw error
        setSuccessMessage('Note updated successfully!')
      } else {
        const { error } = await supabase
          .from('notes')
          .insert({
            details: formData.details,
            reference_number: formData.reference_number,
            date: formData.date
          })

        if (error) throw error
        setSuccessMessage('Note created successfully!')
      }

      setShowAddModal(false)
      setEditingNote(null)
      resetForm()
      fetchNotes()
      setShowSuccess(true)
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving note:', error)
      alert('Error saving note. Please try again.')
    }
  }

  const handleDelete = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        const { error } = await supabase
          .from('notes')
          .delete()
          .eq('id', noteId)

        if (error) throw error
        setSuccessMessage('Note deleted successfully!')
        fetchNotes()
        setShowSuccess(true)
        
        // Hide success message after 3 seconds
        setTimeout(() => setShowSuccess(false), 3000)
      } catch (error) {
        console.error('Error deleting note:', error)
        alert('Error deleting note. Please try again.')
      }
    }
  }

  const handleEdit = (note: Note) => {
    setEditingNote(note)
    setFormData({
      details: note.details,
      reference_number: note.reference_number,
      date: note.date
    })
    setShowAddModal(true)
  }

  const resetForm = () => {
    setFormData({
      details: '',
      reference_number: '',
      date: new Date().toISOString().split('T')[0]
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Notes</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your business notes and references</p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true)
            setEditingNote(null)
            resetForm()
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Note
        </button>
      </div>

      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in slide-in-from-right-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Notes</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{notes.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">This Month</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">
                {notes.filter(note => {
                  const noteDate = new Date(note.date)
                  const now = new Date()
                  return noteDate.getMonth() === now.getMonth() && 
                         noteDate.getFullYear() === now.getFullYear()
                }).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Hash className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">With References</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">
                {notes.filter(note => note.reference_number && note.reference_number.trim() !== '').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Display */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {/* Date Filter */}
        <DateFilter
          dateFilter={filters.dateFilter}
          customDateFrom={filters.customDateFrom}
          customDateTo={filters.customDateTo}
          onFilterChange={handleFilterChange}
          totalCount={notes.length}
          filteredCount={filteredNotes.length}
        />

        {/* Mobile Card View */}
        <div className="block lg:hidden">
          {filteredNotes.map((note, index) => (
            <div key={note.id} className={`p-4 ${index < filteredNotes.length - 1 ? 'border-b-2 border-blue-200 dark:border-blue-800 mb-4' : ''}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{note.details}</h3>
                  {note.reference_number && (
                    <p className="text-sm text-muted-foreground">Ref: {note.reference_number}</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(note)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Edit Note"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Delete Note"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Date: {formatDate(note.date)}</span>
                  </div>
                  <div className="text-xs">
                    Created: {formatDateTime(note.created_at)}
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
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredNotes.map((note, index) => (
                <tr key={note.id} className={`hover:bg-muted/30 ${index < filteredNotes.length - 1 ? 'border-b-2 border-blue-200 dark:border-blue-800' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-muted-foreground mr-2" />
                      <span className="text-sm font-medium text-foreground">
                        {note.details}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {note.reference_number ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        <Hash className="h-3 w-3 mr-1" />
                        {note.reference_number}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">No reference</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                      {formatDate(note.date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateTime(note.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(note)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit Note"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete Note"
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
        
        {filteredNotes.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No notes</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started by adding your first note.
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
                {editingNote ? 'Edit Note' : 'Add New Note'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Details *
                  </label>
                  <textarea
                    value={formData.details}
                    onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                    placeholder="Enter note details"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                    placeholder="Enter reference number (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    {editingNote ? 'Update Note' : 'Create Note'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setEditingNote(null)
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
