# Mobile App Setup Guide

You can convert your website into a mobile app using **Capacitor** - it uses the SAME folder, no need for a new project!

## Option 1: Capacitor (Recommended - Native App)

### Step 1: Install Capacitor
```bash
cd frontend
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
```

### Step 2: Initialize Capacitor
```bash
npx cap init "Campus Dating" "com.campusdating.app"
```

### Step 3: Add Platforms
```bash
# For Android
npx cap add android

# For iOS (Mac only)
npx cap add ios
```

### Step 4: Build Your Next.js App
```bash
npm run build
npm run start
# Or use: npm run dev (for development)
```

### Step 5: Sync with Capacitor
```bash
npx cap sync
```

### Step 6: Open in Native IDEs
```bash
# Android
npx cap open android

# iOS (Mac only)
npx cap open ios
```

### Step 7: Build & Deploy
- **Android**: Build APK/AAB in Android Studio → Upload to Google Play
- **iOS**: Build in Xcode → Upload to App Store

## Option 2: PWA (Progressive Web App - Simpler)

Already set up! Your app can now be installed on mobile devices:

1. Build your app: `npm run build && npm run start`
2. Users can "Add to Home Screen" on mobile browsers
3. Works offline (with service worker - can be added later)

## Quick Start Commands

```bash
# Install Capacitor
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android

# Initialize
npx cap init "Campus Dating" "com.campusdating.app"

# Add platforms
npx cap add android
npx cap add ios  # Mac only

# Build and sync
npm run build
npx cap sync

# Open in native IDEs
npx cap open android
npx cap open ios  # Mac only
```

## Important Notes

1. **Same Folder**: Everything stays in the same folder - no new project needed!
2. **Native Features**: Capacitor gives you access to camera, notifications, etc.
3. **Web Code**: Your existing React/Next.js code works as-is
4. **Build Process**: 
   - Build Next.js app first (`npm run build`)
   - Then sync with Capacitor (`npx cap sync`)
   - Then open in Android Studio/Xcode

## Configuration Files

- `capacitor.config.json` - Capacitor settings (auto-generated)
- `public/manifest.json` - PWA manifest (already created)
- `next.config.js` - Next.js config (already updated)

## Testing

1. **Web**: `npm run dev` - Test in browser
2. **Android**: `npx cap open android` - Test in Android Studio emulator
3. **iOS**: `npx cap open ios` - Test in Xcode simulator (Mac only)

## Deployment

- **Google Play**: Build signed APK/AAB in Android Studio
- **App Store**: Build in Xcode, submit via App Store Connect
- **PWA**: Deploy to any web hosting (Vercel, Netlify, etc.)

