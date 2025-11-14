# Deployment Checklist - Fix "Failed to Fetch" on Login

## 🔍 Step 1: Verify Environment Variables

### Frontend (Vercel):

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Check if `NEXT_PUBLIC_API_URL` exists
3. **Value should be**: `https://your-railway-backend.railway.app`
4. **Important**: 
   - Must have `https://`
   - No trailing slash `/`
   - Exact Railway backend URL

### Backend (Railway):

1. Go to Railway Dashboard → Your Backend Service → Variables
2. Verify `FRONTEND_URL` is set to your Vercel URL
3. **Example**: `https://your-app.vercel.app`
4. **Important**: Must match Vercel URL exactly (including https://)

## 🔧 Step 2: Debug in Browser Console

1. Open your Vercel frontend in browser
2. Press `F12` to open Developer Tools
3. Go to "Console" tab
4. Try to login
5. Look for errors showing:
   - What URL it's trying to fetch
   - Network errors
   - CORS errors

### What to Look For:

**Good Sign**:
```
Backend URL: https://your-backend.railway.app
Attempting login...
```

**Bad Sign**:
```
Backend URL: http://localhost:5000
Failed to fetch...
```
This means `NEXT_PUBLIC_API_URL` is not set in Vercel!

## ✅ Step 3: Quick Fix

### If `NEXT_PUBLIC_API_URL` is missing in Vercel:

1. **Get your Railway backend URL**:
   - Railway Dashboard → Your Backend Service
   - Settings → Domains
   - Copy the domain (e.g., `https://campus-dating-production-xxxx.up.railway.app`)

2. **Add to Vercel**:
   - Vercel → Your Project → Settings → Environment Variables
   - Click "Add New"
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: Your Railway URL (with https://)
   - Environments: Production, Preview, Development (check all)
   - Click "Save"

3. **Redeploy Frontend**:
   - Vercel → Your Project → Deployments
   - Click "..." on latest deployment
   - Click "Redeploy"

### If CORS Error:

1. **Verify `FRONTEND_URL` in Railway**:
   - Must exactly match your Vercel URL
   - Check for typos
   - Include `https://`
   - No trailing slash

2. **Redeploy Backend**:
   - Railway will auto-redeploy after variable change
   - Or manually redeploy

## 🧪 Step 4: Test After Fix

1. **Clear browser cache** (or use incognito)
2. **Open browser console** (F12)
3. **Try login again**
4. **Check console logs**:
   - Should show: `Backend URL: https://...`
   - Should show: `Attempting login...`
   - Should NOT show: `Failed to fetch`

## 🐛 Common Issues:

### Issue 1: "Failed to fetch" - Network Error

**Cause**: `NEXT_PUBLIC_API_URL` not set or wrong

**Fix**:
1. Add `NEXT_PUBLIC_API_URL` in Vercel = Railway backend URL
2. Redeploy frontend

### Issue 2: CORS Error in Console

**Cause**: `FRONTEND_URL` in Railway doesn't match Vercel URL

**Fix**:
1. Verify `FRONTEND_URL` in Railway = your exact Vercel URL
2. Redeploy backend

### Issue 3: 401 Unauthorized

**Cause**: Wrong credentials or user doesn't exist

**Fix**:
1. Check admin email/password in Railway variables
2. Verify admin user was created (check Railway logs for "Seeded admin user")
3. Try registering a new user first

### Issue 4: Still shows localhost in console

**Cause**: Frontend not redeployed after adding env var

**Fix**:
1. Redeploy frontend in Vercel
2. Hard refresh browser (Ctrl+Shift+R)
3. Clear browser cache

## 📋 Verification Checklist:

- [ ] `NEXT_PUBLIC_API_URL` set in Vercel = Railway backend URL
- [ ] Frontend redeployed after adding env var
- [ ] Browser console shows correct backend URL (not localhost)
- [ ] `FRONTEND_URL` in Railway = Vercel URL exactly
- [ ] Backend redeployed (or auto-redeployed)
- [ ] Tried login again
- [ ] Checked browser console for specific error

## 💡 Pro Tip:

After setting environment variables:
1. **Always redeploy** (don't assume auto-deploy)
2. **Clear browser cache** or use incognito
3. **Check browser console** for actual error
4. **Check network tab** in DevTools to see what URL is being called

---

**If still not working after all steps, share:**
1. What you see in browser console (F12 → Console tab)
2. What you see in Network tab (F12 → Network → try login → check the failed request)
3. Your Railway backend URL
4. Your Vercel frontend URL

