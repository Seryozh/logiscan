import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { saveGoogleApiKey, loadGoogleApiKey, clearGoogleApiKey } from '../../utils/localStorage';
import { validateGeminiApiKey } from '../../services/gemini3AgenticVision';

export default function ApiKeyInput() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing key on mount
  useEffect(() => {
    const savedKey = loadGoogleApiKey();
    if (savedKey) {
      setApiKey(savedKey);
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    if (!validateGeminiApiKey(apiKey.trim())) {
      setError('Invalid Gemini API key format. Keys start with "AIza" and are 39 characters');
      return;
    }

    saveGoogleApiKey(apiKey.trim());
    setIsSaved(true);
    setError(null);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to remove your API key?')) {
      clearGoogleApiKey();
      setApiKey('');
      setIsSaved(false);
      setError(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Key className="w-5 h-5" />
            Gemini API Key
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Using Gemini 3 Flash with Agentic Vision
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            ✨ Multi-step reasoning • Code execution • Accurate bounding boxes
          </p>
        </div>

        {isSaved && (
          <div className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>Saved</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="space-y-3">
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setIsSaved(false);
              setError(null);
            }}
            placeholder="AIza..."
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaved && apiKey === loadGoogleApiKey()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isSaved ? 'Saved' : 'Save Key'}
          </button>

          {isSaved && (
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
            >
              Clear
            </button>
          )}
        </div>

        {/* Help */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          <p className="font-semibold mb-2">Get Gemini API Key (Free Tier!):</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Visit <strong>ai.google.dev</strong> (Google AI Studio)</li>
            <li>Sign in with your Google account</li>
            <li>Click "Get API Key" → "Create API Key"</li>
            <li>Copy the key (starts with "AIza") and paste here</li>
          </ol>
          <div className="mt-3 space-y-1 text-xs">
            <p className="text-blue-700">
              <strong>✨ What's Special:</strong> Agentic Vision uses multi-step reasoning
            </p>
            <p className="text-blue-700">
              <strong>💰 Pricing:</strong> Generous free tier, then ~$0.002 per image
            </p>
            <p className="text-blue-700">
              <strong>🎯 Accuracy:</strong> 5-10% better than standard vision APIs
            </p>
          </div>
          <a
            href="https://ai.google.dev/gemini-api/docs/api-key"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-blue-700 hover:text-blue-800 font-medium"
          >
            Get API Key
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Security Note */}
        <p className="text-xs text-gray-500">
          🔒 Your API key is stored locally in your browser and never sent to our servers.
        </p>
      </div>
    </div>
  );
}
