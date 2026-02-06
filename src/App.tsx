import { useState } from 'react';
import { SessionProvider } from './stores/sessionStore';
import ImportPanel from './components/import/ImportPanel';
import PackageList from './components/package-list/PackageList';
import SummaryPanel from './components/summary/SummaryPanel';
import CameraPanel from './components/camera/CameraPanel';
import PhotoThumbnails from './components/camera/PhotoThumbnails';
import DetectionViewer from './components/detection/DetectionViewer';
import ApiKeyInput from './components/shared/ApiKeyInput';
import ReviewQueue from './components/review/ReviewQueue';

function AppContent() {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">LogiScan</h1>
              <p className="text-sm text-gray-500">Package Scanner & Reconciliation</p>
            </div>
            <div className="text-sm text-gray-500">
              logiscan.me
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 3 Column Layout */}
      <main className="max-w-[1800px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Setup & Import */}
          <div className="lg:col-span-1 space-y-6">
            <ApiKeyInput />
            <ImportPanel />
          </div>

          {/* Center Column - Camera/Viewer */}
          <div className="lg:col-span-1 space-y-6">
            {selectedPhotoId ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Detection Results</h2>
                  <button
                    onClick={() => setSelectedPhotoId(null)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Back to Camera
                  </button>
                </div>
                <DetectionViewer photoId={selectedPhotoId} />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Camera & Capture</h2>
                <CameraPanel />
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <PhotoThumbnails
                selectedPhotoId={selectedPhotoId}
                onSelectPhoto={setSelectedPhotoId}
              />
            </div>
          </div>

          {/* Right Column - Package List & Summary */}
          <div className="lg:col-span-1 space-y-6">
            <SummaryPanel />
            <ReviewQueue />
            <PackageList />
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}

export default App;
