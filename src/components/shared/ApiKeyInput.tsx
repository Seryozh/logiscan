import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { saveApiKey, loadApiKey, clearApiKey, saveGoogleApiKey, loadGoogleApiKey, clearGoogleApiKey } from '../../utils/localStorage';
import { validateApiKey, DETECTION_SERVICE } from '../../services/aiService';
import { validateGoogleApiKey } from '../../services/googleVisionService';

export default function ApiKeyInput() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGoogleVision = DETECTION_SERVICE === 'google-vision';

  // Load existing key on mount
  useEffect(() => {
    const savedKey = isGoogleVision ? loadGoogleApiKey() : loadApiKey();
    if (savedKey) {
      setApiKey(savedKey);
      setIsSaved(true);
    }
  }, [isGoogleVision]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    if (isGoogleVision) {
      if (!validateGoogleApiKey(apiKey.trim())) {
        setError('Invalid Google API key format. Keys start with "AIza" and are 39 characters');
        return;
      }
      saveGoogleApiKey(apiKey.trim());
    } else {
      if (!validateApiKey(apiKey.trim())) {
        setError('Invalid API key format. OpenRouter keys start with "sk-or-"');
        return;
      }
      saveApiKey(apiKey.trim());
    }

    setIsSaved(true);
    setError(null);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to remove your API key?')) {
      if (isGoogleVision) {
        clearGoogleApiKey();
      } else {
        clearApiKey();
      }
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
            {isGoogleVision ? 'Google Cloud API Key' : 'OpenRouter API Key'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isGoogleVision
              ? 'Using Google Cloud Vision API for detection'
              : 'Using OpenRouter for AI-powered detection'
            }
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
            placeholder={isGoogleVision ? 'AIza...' : 'sk-or-v1-...'}
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
            disabled={isSaved && apiKey === loadApiKey()}
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
        {isGoogleVision ? (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
            <p className="font-semibold mb-2">Get Google Cloud API Key:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Go to console.cloud.google.com and create a project</li>
              <li>Enable "Cloud Vision API"</li>
              <li>Create credentials → API Key</li>
              <li>Copy key (starts with "AIza") and paste here</li>
              <li>Set up billing (required, but 1,000 images/month free)</li>
            </ol>
            <p className="text-xs mt-2 text-blue-700">
              <strong>Pricing:</strong> FREE for first 1,000 images/month, then $1.50 per 1,000
            </p>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-blue-700 hover:text-blue-800 font-medium"
            >
              Get API Key
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
            <p className="font-semibold mb-2">Don't have an API key?</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Visit OpenRouter.ai and sign up for a free account</li>
              <li>Add credits to your account ($5 minimum recommended)</li>
              <li>Navigate to Keys section and generate a new key</li>
              <li>Copy the key (starts with "sk-or-") and paste it here</li>
            </ol>
            <p className="text-xs mt-2 text-blue-700">
              Using <strong>Gemini 2.5 Flash</strong>: ~$0.30 per 1M tokens
            </p>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-blue-700 hover:text-blue-800 font-medium"
            >
              Get API Key
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Security Note */}
        <p className="text-xs text-gray-500">
          🔒 Your API key is stored locally in your browser and never sent to our servers.
        </p>
      </div>
    </div>
  );
}
