# Mobile App Backend Configuration

## ✅ Your Production Backend URL
```
https://campus-dating-production.up.railway.app
```

## 🔧 Setup for Mobile App

For the mobile app, you need to set the production backend URL so the app connects to your deployed backend, not localhost.

### Option 1: Set in .env.local (Recommended)

Create a file `frontend/.env.local` with:

```env
NEXT_PUBLIC_BACKEND_URL=https://campus-dating-production.up.railway.app
NEXT_PUBLIC_API_URL=https://campus-dating-production.up.railway.app
```

**Important**: This file is gitignored, so it won't be committed. Each developer needs to create their own.

### Option 2: Hardcode for Production Build (Not Recommended)

You can temporarily hardcode it in `api.js`, but this is not recommended for production.

## 📱 Steps to Fix Mobile App Connection

1. **Create `.env.local` file** in `frontend/` folder:
   ```env
   NEXT_PUBLIC_BACKEND_URL=https://campus-dating-production.up.railway.app
   NEXT_PUBLIC_API_URL=https://campus-dating-production.up.railway.app
   ```

2. **Rebuild the app**:
   ```bash
   cd frontend
   npm run build
   npx cap sync
   ```

3. **Rebuild in Android Studio**:
   - Open Android Studio
   - Click the green "Run" button
   - Install on your phone again

4. **Test**: The app should now connect to your production backend!

## 🔍 Verify Backend is Working

Test your backend in a browser:
```
https://campus-dating-production.up.railway.app/api/health
```

Should return: `{"ok":true,"status":"healthy",...}`

## ⚠️ Important Notes

- **Production URL**: Always use `https://campus-dating-production.up.railway.app` for mobile app
- **Local Development**: For web development, you can still use `http://localhost:4000` in a separate `.env.local` (but rebuild mobile app with production URL)
- **Backend CORS**: Make sure your Railway backend has `FRONTEND_URL` set to allow requests from your mobile app (you may need to add `capacitor://localhost` or your app's bundle ID)

## 🐛 If Still Not Working

1. **Check build output**: After `npm run build`, check the console - it should show the backend URL being used
2. **Check Android Studio logs**: Look for network errors in Logcat
3. **Test backend directly**: Open `https://campus-dating-production.up.railway.app/api/health` on your phone's browser
4. **Check CORS**: The backend might be blocking requests from the mobile app - you may need to update CORS settings in Railway

