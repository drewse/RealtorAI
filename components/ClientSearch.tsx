'use client';

import { useState } from 'react';

interface ClientSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: 'all' | 'Active' | 'Cold' | 'Hot Lead';
  onStatusFilterChange: (status: 'all' | 'Active' | 'Cold' | 'Hot Lead') => void;
  sortBy: 'recent' | 'name' | 'interactions' | 'status';
  onSortChange: (sort: 'recent' | 'name' | 'interactions' | 'status') => void;
  statusCounts: {
    all: number;
    'Active': number;
    'Cold': number;
    'Hot Lead': number;
  };
}

export default function ClientSearch({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
  statusCounts
}: ClientSearchProps) {
  const [showFilters, setShowFilters] = useState(false);

  const sortOptions = [
    { value: 'recent', label: 'Recent Activity', icon: 'ri-time-line' },
    { value: 'name', label: 'Name (A-Z)', icon: 'ri-sort-asc' },
    { value: 'interactions', label: 'Most Interactions', icon: 'ri-chat-3-line' },
    { value: 'status', label: 'Lead Status', icon: 'ri-fire-line' }
  ];

  return (
    <div className="mb-6 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <div className="w-5 h-5 flex items-center justify-center">
            <i className="ri-search-line text-gray-400"></i>
          </div>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="Search by name, email, tags, or preferences..."
        />
      </div>

      {/* Filter and Sort Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-white transition-colors cursor-pointer whitespace-nowrap"
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-filter-line"></i>
          </div>
          <span className="text-sm">Filters</span>
          <div className="w-4 h-4 flex items-center justify-center">
            <i className={`ri-arrow-${showFilters ? 'up' : 'down'}-s-line transition-transform`}></i>
          </div>
        </button>

        {/* Quick Status Indicator */}
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <span>{statusCounts[statusFilter]} client{statusCounts[statusFilter] !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'all', label: 'All Clients', count: statusCounts.all },
                { key: 'Hot Lead', label: 'Hot Leads', count: statusCounts['Hot Lead'] },
                { key: 'Active', label: 'Active', count: statusCounts['Active'] },
                { key: 'Cold', label: 'Cold', count: statusCounts['Cold'] }
              ].map((status) => (
                <button
                  key={status.key}
                  onClick={() => onStatusFilterChange(status.key as any)}
                  className={`p-2 rounded-lg text-left transition-colors cursor-pointer ${
                    statusFilter === status.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{status.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      statusFilter === status.key
                        ? 'bg-blue-700 text-blue-100'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {status.count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
            <div className="grid grid-cols-1 gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onSortChange(option.value as any)}
                  className={`p-2 rounded-lg text-left transition-colors cursor-pointer flex items-center space-x-2 ${
                    sortBy === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className={option.icon}></i>
                  </div>
                  <span className="text-sm">{option.label}</span>
                  {sortBy === option.value && (
                    <div className="w-4 h-4 flex items-center justify-center ml-auto">
                      <i className="ri-check-line"></i>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}