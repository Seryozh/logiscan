import { useState } from 'react';
import { AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { parsePackageList } from '../../utils/parsePackageList';
import { useSession } from '../../stores/sessionStore';
import type { ParsingError } from '../../types/models';

export default function ImportPanel() {
  const { setPackages, state } = useSession();
  const [rawText, setRawText] = useState('');
  const [errors, setErrors] = useState<ParsingError[]>([]);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleParse = () => {
    if (!rawText.trim()) {
      return;
    }

    const result = parsePackageList(rawText);
    setErrors(result.errors);
    setSuccessCount(result.packages.length);

    if (result.packages.length > 0) {
      setShowPreview(true);
      // Don't commit yet - show preview first
    }
  };

  const handleConfirmImport = () => {
    const result = parsePackageList(rawText);
    setPackages(result.packages);
    setRawText('');
    setShowPreview(false);
    setSuccessCount(null);
    setErrors([]);
  };

  const handleCancel = () => {
    setShowPreview(false);
    setSuccessCount(null);
    setErrors([]);
  };

  const hasPackages = state.packages.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Package List</h2>

      {hasPackages && !showPreview && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <CheckCircle className="inline w-4 h-4 mr-2" />
          {state.packages.length} packages loaded. Paste new list to replace.
        </div>
      )}

      <div className="space-y-4">
        {/* Textarea */}
        <div>
          <label htmlFor="package-list" className="block text-sm font-medium text-gray-700 mb-2">
            Paste raw package list (tab or space separated)
          </label>
          <textarea
            id="package-list"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="C01K Unit    ESCARDO ENTERPRISE LLC    UPS - #2165790850 - 1ZA8272V1341859679 MARIA ESPEJO    3901    1/30/2026 6:57:06 PM"
            className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            disabled={showPreview}
          />
        </div>

        {/* Parse Button */}
        {!showPreview && (
          <button
            onClick={handleParse}
            disabled={!rawText.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Upload className="inline w-4 h-4 mr-2" />
            Parse List
          </button>
        )}

        {/* Results */}
        {successCount !== null && (
          <div className="space-y-3">
            {/* Success message */}
            {successCount > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Successfully parsed {successCount} package{successCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 mb-2">
                      {errors.length} line{errors.length !== 1 ? 's' : ''} failed to parse
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {errors.map((error, idx) => (
                        <div key={idx} className="text-xs text-red-700 font-mono">
                          <span className="font-semibold">Line {error.lineNumber}:</span> {error.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Table */}
            {showPreview && successCount > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-700">Preview</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Apt</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Last 4</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Carrier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {parsePackageList(rawText).packages.slice(0, 10).map((pkg) => (
                        <tr key={pkg.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs">{pkg.apartment}</td>
                          <td className="px-3 py-2 font-mono text-xs">{pkg.trackingLast4}</td>
                          <td className="px-3 py-2 text-xs">{pkg.carrier}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {successCount > 10 && (
                    <div className="px-3 py-2 text-xs text-gray-500 text-center bg-gray-50 border-t border-gray-200">
                      ... and {successCount - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {showPreview && (
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmImport}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Confirm Import
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 space-y-1">
          <p className="font-semibold">Expected format:</p>
          <p className="font-mono">C##L Unit [TAB] Entity [TAB] CARRIER - #REF - TRACKING RECIPIENT</p>
          <p className="mt-2">Example: C02G for apartment, 3728 for tracking last 4 digits</p>
        </div>
      </div>
    </div>
  );
}
