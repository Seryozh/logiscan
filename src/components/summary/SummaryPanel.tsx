import { Download, Trash2 } from 'lucide-react';
import { useSession } from '../../stores/sessionStore';
import { exportRemainingPackages } from '../../utils/exportResults';

export default function SummaryPanel() {
  const { state, clearSession } = useSession();

  const stats = {
    total: state.packages.length,
    pending: state.packages.filter(p => p.status === 'pending').length,
    found: state.packages.filter(p => p.status === 'found').length,
    verified: state.packages.filter(p => p.status === 'verified').length,
    notFound: state.packages.filter(p => p.status === 'not_found').length,
  };

  const foundOrVerified = stats.found + stats.verified;
  const progressPercent = stats.total > 0 ? (foundOrVerified / stats.total) * 100 : 0;

  const handleExport = () => {
    const remainingPackages = state.packages.filter(p => p.status === 'pending' || p.status === 'not_found');
    const content = exportRemainingPackages(remainingPackages);

    // Download as text file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remaining-packages-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearSession = () => {
    if (confirm('Are you sure you want to clear the current session? This will remove all imported packages and captured photos.')) {
      clearSession();
    }
  };

  if (stats.total === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Summary</h2>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Progress</span>
          <span className="font-semibold text-gray-900">
            {foundOrVerified} / {stats.total}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-green-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1 text-right">
          {progressPercent.toFixed(1)}% complete
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
          <div className="text-xs text-gray-600">Pending</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-900">{stats.found}</div>
          <div className="text-xs text-blue-600">Found</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-900">{stats.verified}</div>
          <div className="text-xs text-green-600">Verified</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-yellow-900">{stats.notFound}</div>
          <div className="text-xs text-yellow-600">Not Found</div>
        </div>
      </div>

      {/* Session Info */}
      <div className="text-xs text-gray-500 space-y-1 mb-6 pb-6 border-b border-gray-200">
        <div>
          <span className="font-semibold">Session ID:</span> {state.sessionId.slice(0, 8)}
        </div>
        <div>
          <span className="font-semibold">Started:</span>{' '}
          {new Date(state.createdAt).toLocaleString()}
        </div>
        <div>
          <span className="font-semibold">Last Updated:</span>{' '}
          {new Date(state.lastModified).toLocaleString()}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={handleExport}
          disabled={stats.pending === 0 && stats.notFound === 0}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export Remaining ({stats.pending + stats.notFound})
        </button>

        <button
          onClick={handleClearSession}
          className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Clear Session
        </button>
      </div>
    </div>
  );
}
