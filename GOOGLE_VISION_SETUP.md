# Google Cloud Vision API Setup Guide

## Quick Start (5 minutes)

### 1. Create Project & Enable API
1. Go to: https://console.cloud.google.com
2. Create new project: "LogiScan"
3. Search for "Vision API" → Enable it
4. Wait 30 seconds for activation

### 2. Get API Key
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "+ CREATE CREDENTIALS" → "API Key"
3. Copy the key (starts with `AIza...`)
4. Save it somewhere safe!

### 3. (Optional) Restrict Key for Security
1. Click "Restrict Key" after creating
2. **Application restrictions:** HTTP referrers
   - Add: `http://localhost:*`
   - Add: `https://logiscan.me/*`
3. **API restrictions:** Restrict to "Cloud Vision API"
4. Save

### 4. Set Up Billing
⚠️ **Required** (even for free tier)

1. Go to "Billing" in Cloud Console
2. Add credit card (won't charge until you exceed free tier)
3. **Free Tier:** 1,000 images/month
4. **Paid:** $1.50 per 1,000 images

### 5. Set Budget Alert (Recommended)
1. Billing → Budgets & alerts
2. Create budget: $10/month
3. Email alerts at 50%, 90%, 100%

---

## Integration

### Switch to Google Cloud Vision:

1. **Edit:** `/src/services/aiService.ts`
2. **Change line 6:**
   ```typescript
   export const DETECTION_SERVICE: DetectionService = 'google-vision';
   ```
3. **In the app:** Enter your Google Cloud API key instead of OpenRouter key
4. **Test:** Upload a photo and check results!

---

## Pricing Examples

| Usage | Cost |
|-------|------|
| 100 images | FREE |
| 1,000 images | FREE |
| 5,000 images | $6.00 |
| 10,000 images | $13.50 |
| 50,000 images | $73.50 |

Compare to OpenRouter:
- Gemini 2.5 Flash: ~$0.30 per 1,000 images (cheaper!)
- Qwen3-VL-8B: ~$0.08 per 1,000 images (cheapest!)

**Note:** Google Cloud Vision is more expensive but potentially more accurate.

---

## Troubleshooting

### "403 Forbidden"
- Enable Vision API in Cloud Console
- Check API key restrictions
- Verify billing is set up

### "Invalid API Key"
- Key should start with `AIza`
- Key should be 39 characters
- No spaces or line breaks

### "Quota Exceeded"
- You've used >1,000 images this month
- Add billing to continue
- Check usage: https://console.cloud.google.com/apis/dashboard

---

## Switch Back to OpenRouter

If Google Vision doesn't work well:

1. Edit `/src/services/aiService.ts`
2. Change back to: `export const DETECTION_SERVICE: DetectionService = 'openrouter';`
3. Use your OpenRouter API key
