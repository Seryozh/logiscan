# LogiScan Package Scanner

A web-based package scanning and reconciliation app that uses AI vision to detect package stickers and match them against imported package lists.

## Features

- **Package List Import**: Parse tab or space-separated package lists with apartment codes, tracking numbers, carriers, and recipients
- **Camera Integration**: Capture photos of packages using your device's camera or upload images
- **AI Vision Detection**: Automatically detect and read package stickers using Google Cloud Vision API or OpenRouter AI models
- **Visual Feedback**: Color-coded bounding boxes show detection status (matched, duplicate, orphan, unreadable)
- **Smart Matching**: Automatically matches detections to packages by apartment code and tracking number
- **Session Persistence**: All data saved locally in your browser - no server needed
- **Export Results**: Export remaining unmatched packages for further processing

## Tech Stack

- **React 19** + **TypeScript** - Modern UI framework with type safety
- **Vite** - Lightning-fast build tool
- **TailwindCSS 4** - Utility-first styling
- **Google Cloud Vision API** - Primary OCR and text detection service
- **OpenRouter** - Alternative AI vision provider (Gemini 2.5 Flash, Qwen3-VL models)
- **Vitest** - Unit testing (46 tests passing)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Google Cloud Vision API key OR OpenRouter API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Seryozh/logiscan.git
cd logiscan
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Getting an API Key

#### Option 1: Google Cloud Vision (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable "Cloud Vision API"
4. Create credentials → API Key
5. Copy the key (starts with `AIza`)

**Pricing**: First 1,000 images/month free, then $1.50 per 1,000 images

See [GOOGLE_VISION_SETUP.md](./GOOGLE_VISION_SETUP.md) for detailed instructions.

#### Option 2: OpenRouter

1. Visit [OpenRouter.ai](https://openrouter.ai) and sign up
2. Add credits ($5 minimum)
3. Generate an API key (starts with `sk-or-`)

**Pricing**: ~$0.08-0.30 per 1,000 images depending on model

### Switching AI Providers

Edit `/src/services/aiService.ts` line 8:

```typescript
// Use Google Cloud Vision (recommended)
export const DETECTION_SERVICE: DetectionService = 'google-vision';

// OR use OpenRouter
export const DETECTION_SERVICE: DetectionService = 'openrouter';
```

## Usage

1. **Import Package List**: Paste a tab or space-separated list with columns:
   - Apartment code (e.g., C12A)
   - Carrier - Tracking Number (e.g., UPS - 1Z999AA10123456789)
   - Recipient Name

2. **Capture Photos**: Use the camera to take photos of packages or upload existing images

3. **AI Detection**: Photos are automatically processed to detect stickers

4. **Review Matches**: Check the color-coded bounding boxes:
   - 🟢 Green: Matched to package list
   - 🟡 Yellow: Duplicate detection
   - 🟠 Orange: Orphan (not in list)
   - 🔴 Red: Unreadable
   - 🟣 Purple: Ambiguous (multiple matches)

5. **Export Results**: Download remaining unmatched packages

## Building for Production

```bash
npm run build
```

Output will be in the `dist/` directory. Deploy the contents to any static hosting service.

### Deployment Options

- **Vercel**: Connect GitHub repo, auto-deploys on push
- **Netlify**: Drag & drop `dist` folder or connect repo
- **Custom Server**: Serve `dist` folder with nginx/Apache

## Testing

```bash
# Run tests
npm run test

# Run tests with UI
npm run test:ui
```

## Project Structure

```
/src
  /components      # React components
    /camera        # Camera capture and photo thumbnails
    /detection     # Bounding box overlay and viewer
    /import        # Package list import UI
    /package-list  # Package display and filtering
    /review        # Verification queue
    /shared        # API key input, reusable components
    /summary       # Progress tracking and export
  /hooks           # Custom React hooks (useCamera, useAIDetection)
  /services        # AI service integrations
  /stores          # State management (React Context + useReducer)
  /types           # TypeScript type definitions
  /utils           # Parsers, matching algorithm, helpers
  /constants       # AI prompts and configuration
```

## Key Files

- `src/services/aiService.ts` - AI provider configuration
- `src/services/googleVisionService.ts` - Google Cloud Vision integration
- `src/utils/parsePackageList.ts` - Package list parser (29 tests)
- `src/utils/matchingAlgorithm.ts` - Detection matching logic (17 tests)
- `src/stores/sessionStore.tsx` - Global state management
- `src/components/detection/BoundingBoxOverlay.tsx` - Visual detection display

## Privacy & Security

- **No Server**: All processing happens in your browser
- **Local Storage Only**: API keys and session data stored locally
- **No Data Upload**: Images and package data never leave your device (except AI API calls)
- **API Key Protection**: Keys stored in browser localStorage, never exposed in code

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with camera access

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
