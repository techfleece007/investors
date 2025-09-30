'use client'

import { useState } from 'react'
import { Calendar, Filter } from 'lucide-react'

interface DateFilterProps {
  dateFilter: 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'
  customDateFrom: string
  customDateTo: string
  onFilterChange: (filterType: string, value: string) => void
  totalCount: number
  filteredCount: number
}

export default function DateFilter({
  dateFilter,
  customDateFrom,
  customDateTo,
  onFilterChange,
  totalCount,
  filteredCount
}: DateFilterProps) {
  const [showCustomDates, setShowCustomDates] = useState(false)

  const handleDateFilterChange = (value: string) => {
    onFilterChange('dateFilter', value)
    if (value === 'custom') {
      setShowCustomDates(true)
    } else {
      setShowCustomDates(false)
    }
  }

  return (
    <div className="p-4 border-b border-border bg-muted/50">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Filter Icon and Label */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Date Filter:</span>
        </div>
        
        {/* Date Filter Dropdown */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
          <select
            value={dateFilter}
            onChange={(e) => handleDateFilterChange(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground min-w-[140px]"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>

          {/* Custom Date Range - Responsive Layout */}
          {dateFilter === 'custom' && (
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">From:</span>
              </div>
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => onFilterChange('customDateFrom', e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
              />
              <span className="text-sm text-muted-foreground hidden sm:inline">to</span>
              <div className="flex items-center gap-2 sm:hidden">
                <span className="text-sm text-muted-foreground">To:</span>
              </div>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => onFilterChange('customDateTo', e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
              />
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground ml-auto">
          Showing {filteredCount} of {totalCount} records
        </div>
      </div>
    </div>
  )
}
