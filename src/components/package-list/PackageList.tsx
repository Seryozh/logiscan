import { useState, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import { useSession } from '../../stores/sessionStore';
import PackageCard from './PackageCard';
import type { PackageStatus } from '../../types/models';

type FilterOption = 'all' | PackageStatus;

export default function PackageList() {
  const { state } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterOption>('all');

  // Filter and search packages
  const filteredPackages = useMemo(() => {
    let result = state.packages;

    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(pkg => pkg.status === filterStatus);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        pkg =>
          pkg.apartment.toLowerCase().includes(query) ||
          pkg.trackingLast4.includes(query) ||
          pkg.recipient.toLowerCase().includes(query) ||
          pkg.carrier.toLowerCase().includes(query)
      );
    }

    return result;
  }, [state.packages, filterStatus, searchQuery]);

  if (state.packages.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Package List</h2>
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">No packages imported yet</p>
          <p className="text-xs mt-2">Paste a package list in the Import panel to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Package List</h2>

        {/* Search and Filter */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by apartment, tracking, or recipient..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterOption)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Packages ({state.packages.length})</option>
              <option value="pending">
                Pending ({state.packages.filter(p => p.status === 'pending').length})
              </option>
              <option value="found">
                Found ({state.packages.filter(p => p.status === 'found').length})
              </option>
              <option value="verified">
                Verified ({state.packages.filter(p => p.status === 'verified').length})
              </option>
              <option value="not_found">
                Not Found ({state.packages.filter(p => p.status === 'not_found').length})
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Package List */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {filteredPackages.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            No packages match your search or filter
          </div>
        ) : (
          filteredPackages.map(pkg => <PackageCard key={pkg.id} package={pkg} />)
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-center">
        Showing {filteredPackages.length} of {state.packages.length} packages
      </div>
    </div>
  );
}
