# 🚨 Fix "Cannot reach backend server" Error

## ✅ Your Backend URL
```
https://campus-dating-production.up.railway.app
```

**Status**: ✅ Backend is accessible (health check works)

## 🔧 Solution: Configure Vercel Environment Variable

### Step 1: Set Environment Variable in Vercel

1. Go to **Vercel Dashboard**: https://vercel.com/dashboard
2. Click on **your project**
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Set:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://campus-dating-production.up.railway.app`
   - ⚠️ **IMPORTANT**: Must include `https://` prefix!
   - **Environments**: Check ✅ **Production**, ✅ **Preview**, ✅ **Development**
6. Click **"Save"**

### Step 2: Redeploy Frontend

**Option A: Redeploy from Dashboard**
1. Go to **Vercel Dashboard** → Your Project → **Deployments**
2. Click **"..."** (three dots) on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete

**Option B: Push a commit** (if connected to Git)
```bash
git add .
git commit -m "Update API configuration"
git push
```

### Step 3: Clear Browser Cache & Test

1. **Hard refresh** your browser:
   - **Chrome/Edge**: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
   - **Firefox**: `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)

2. **Open Browser Console** (F12)
   - Should see: `🔗 Backend URL: https://campus-dating-production.up.railway.app`
   - If you see `http://localhost:5000`, the env var isn't set correctly

3. **Try logging in**
   - Open Console (F12) → Network tab
   - Attempt login
   - Check what URL is being called
   - Should see: `📤 API POST Request: { url: 'https://campus-dating-production.up.railway.app/api/auth/login', ... }`

### Step 4: Verify Backend CORS

Make sure in **Railway** → Your Backend Service → **Variables**, you have:

- `FRONTEND_URL` = Your Vercel frontend URL (e.g., `https://your-app.vercel.app`)

**Important**: The `FRONTEND_URL` must match your Vercel domain exactly (with `https://`)

---

## 🐛 If Still Not Working

### Check Browser Console

After redeploying, open browser console (F12) and look for:

1. **Backend URL log**: Should show the Railway URL
   ```
   🔗 Backend URL: https://campus-dating-production.up.railway.app
   ```

2. **API Request logs**: When you try to login, you should see:
   ```
   📤 API POST Request: { url: '...', ... }
   📥 API Response: { ... }
   ```

3. **Network errors**: If you see network errors, check:
   - Is the backend URL correct?
   - Is the frontend URL in Railway's `FRONTEND_URL` correct?
   - Are both using `https://`?

### Verify Vercel Environment Variables

1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Make sure `NEXT_PUBLIC_API_URL` is visible
3. Make sure it's set for **Production** environment
4. If it's only set for Development, redeploy won't use it!

### Test Backend Directly

Open in browser:
```
https://campus-dating-production.up.railway.app/api/health
```

Should return: `{"ok":true,"status":"healthy","timestamp":"..."}`

---

## ✅ Quick Checklist

- [ ] `NEXT_PUBLIC_API_URL` set in Vercel = `https://campus-dating-production.up.railway.app`
- [ ] Environment variable set for **Production** (and Preview/Development)
- [ ] Frontend redeployed after setting env var
- [ ] Browser cache cleared (hard refresh)
- [ ] Browser console shows correct backend URL
- [ ] `FRONTEND_URL` set in Railway = your Vercel URL
- [ ] Backend health check works: `https://campus-dating-production.up.railway.app/api/health`
- [ ] Tried login again

---

## 📝 Notes

- **The code I updated will auto-add `https://` if you forget**, but it's better to set it correctly in Vercel!
- **Next.js requires `NEXT_PUBLIC_` prefix** for environment variables that should be available in the browser
- **After setting env vars, you MUST redeploy** - they're not hot-reloaded
- **Clear browser cache** - old JavaScript might be cached

