# Troubleshooting Guide

## 🔴 Getting `{"error":"Not found"}` on `/api/health`

### Possible Causes:

1. **Wrong URL Path** - Make sure you're using the FULL path:
   ```
   https://your-app.railway.app/api/health
   ```
   NOT just:
   ```
   https://your-app.railway.app/health
   ```

2. **Server Not Starting** - Check Railway logs:
   - Go to Railway → Your Service → Deployments → Latest
   - Click "View Logs"
   - Look for errors during startup

3. **Database Connection Failing** - If `MONGO_URI` is wrong, server might crash before routes load:
   - Check logs for "MongoServerError" or "connection" errors
   - Verify `MONGO_URI` is correct in Railway variables
   - Make sure MongoDB Atlas IP whitelist allows all (0.0.0.0/0)

4. **Port Configuration** - Railway might be using a different port:
   - Railway automatically sets `PORT` environment variable
   - Make sure you have `PORT` variable in Railway (even if just set to auto)

### Quick Fixes:

#### Fix 1: Check the Exact URL
Make sure your Railway backend URL looks like:
```
https://campus-dating-production-xxxx.up.railway.app
```

Then test:
```
https://campus-dating-production-xxxx.up.railway.app/api/health
```

#### Fix 2: Check Railway Logs
1. Go to Railway dashboard
2. Click your backend service
3. Click "Deployments" tab
4. Click the latest deployment
5. Click "View Logs"
6. Look for:
   - ✅ `Backend listening on port XXXX` - Server started
   - ❌ `MongoServerError` - Database connection issue
   - ❌ `Cannot find module` - Missing dependencies
   - ❌ `EADDRINUSE` - Port already in use

#### Fix 3: Verify Environment Variables
Check Railway → Variables tab for:
- `MONGO_URI` - Must be valid MongoDB connection string
- `PORT` - Can be auto-set by Railway (don't need to set manually)
- `FRONTEND_URL` - Should be your Vercel URL

#### Fix 4: Check Database Connection
If logs show database errors:
1. Go to MongoDB Atlas
2. Network Access → Add IP Address
3. Add `0.0.0.0/0` (allow all) OR add Railway's IP
4. Database Access → Make sure user has read/write permissions

### Test Different Endpoints:

Try these URLs in order:
1. `/api/health` - Basic health check
2. `/api/auth/login` - Should show method not allowed (if POST only)
3. `/` - Root endpoint (should show not found)

### Expected Behavior:

✅ **Good Response**:
```json
{"ok": true, "status": "healthy", "timestamp": "2024-..."}
```

❌ **Bad Responses**:
- `{"error": "Not found"}` - Route not found or server not started
- `Cannot GET /api/health` - Server not running
- `ECONNREFUSED` - Server crashed or not deployed
- `MongoServerError` - Database connection failed

### If Still Not Working:

1. **Redeploy Backend**:
   - Railway → Your Service → Settings → Redeploy
   - Or push a small change to trigger redeploy

2. **Check Railway Status**:
   - Railway might be having issues
   - Check Railway status page

3. **Verify Service is Running**:
   - Railway dashboard should show green "Active" status
   - Check "Metrics" tab for CPU/Memory usage

4. **Test Locally First**:
   ```bash
   cd backend
   npm install
   npm start
   ```
   Then test: `http://localhost:5000/api/health`
   
   If this works, issue is with Railway deployment, not code.

