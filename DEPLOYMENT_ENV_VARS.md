# Environment Variables Setup Guide

## 🚨 CRITICAL: You need ALL these environment variables in Railway!

The "failed to fetch" error happens because the backend needs all environment variables set in Railway, not just hardcoded in files.

## Backend Environment Variables (Railway)

Add ALL of these in Railway → Your Backend Project → Variables:

### Required Variables:

```
PORT=5000
```

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/campus-dating
```
- Get this from MongoDB Atlas
- Format: `mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DATABASE_NAME`

```
JWT_SECRET=your-super-secret-random-string-here-min-32-chars
```
- Generate a strong random string (at least 32 characters)
- Example: `openssl rand -hex 32`

```
FRONTEND_URL=https://your-frontend-app.vercel.app
```
- Your Vercel deployment URL (e.g., `https://campus-dating.vercel.app`)
- **CRITICAL** for CORS to work!

```
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```
- Get these from Cloudinary dashboard

```
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-admin-password-here
```
- Used to create admin user on first deploy

### Optional Variables:

```
SENDGRID_API_KEY=your-sendgrid-key
```
- For email functionality (optional)

```
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```
- Alternative email setup (optional)

---

## Frontend Environment Variables (Vercel)

Add this in Vercel → Your Frontend Project → Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-backend-app.railway.app
```
- Your Railway backend URL (e.g., `https://campus-dating-production.up.railway.app`)
- **CRITICAL** for frontend to connect to backend!

---

## 🔧 Step-by-Step Fix for "Failed to Fetch" Error:

### 1. Check Your Railway Backend URL

1. Go to Railway dashboard
2. Click on your backend service
3. Copy the domain (e.g., `https://your-app.railway.app`)

### 2. Set Frontend Environment Variable

1. Go to Vercel dashboard
2. Your project → Settings → Environment Variables
3. Add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: Your Railway backend URL
   - **Environment**: Production, Preview, Development
4. **Redeploy** the frontend!

### 3. Verify Backend Environment Variables in Railway

1. Go to Railway dashboard
2. Your backend service → Variables tab
3. Verify you have ALL required variables listed above
4. **Important**: Make sure `FRONTEND_URL` matches your Vercel URL exactly!

### 4. Test Backend Health Endpoint

Open in browser:
```
https://your-backend-app.railway.app/api/health
```

Should return: `{"ok":true}`

If this doesn't work, your backend isn't deployed correctly.

### 5. Check CORS Settings

The backend uses `FRONTEND_URL` for CORS. Make sure:
- `FRONTEND_URL` in Railway = your Vercel URL exactly (with https://)
- No trailing slash

---

## 🐛 Common Issues:

### Issue 1: "Failed to fetch" on login

**Cause**: Frontend can't reach backend

**Fix**:
- ✅ Set `NEXT_PUBLIC_API_URL` in Vercel = Railway backend URL
- ✅ Redeploy frontend
- ✅ Check backend is running (health endpoint)

### Issue 2: CORS errors

**Cause**: `FRONTEND_URL` in Railway doesn't match Vercel URL

**Fix**:
- ✅ Set `FRONTEND_URL` in Railway = your Vercel URL (exactly, with https://)
- ✅ Redeploy backend

### Issue 3: Database connection fails

**Cause**: `MONGO_URI` is wrong or not set

**Fix**:
- ✅ Check MongoDB Atlas connection string
- ✅ Make sure IP is whitelisted (allow all: `0.0.0.0/0`)
- ✅ Verify database name is correct

### Issue 4: Images not uploading

**Cause**: Cloudinary credentials missing

**Fix**:
- ✅ Set all 3 Cloudinary variables in Railway:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`

---

## ✅ Quick Checklist:

- [ ] All backend env vars set in Railway
- [ ] `NEXT_PUBLIC_API_URL` set in Vercel
- [ ] `FRONTEND_URL` in Railway matches Vercel URL
- [ ] Backend health endpoint works (`/api/health`)
- [ ] Both services redeployed after setting env vars
- [ ] MongoDB connection working
- [ ] CORS configured correctly

---

## 📝 Example Railway Variables:

```
PORT=5000
MONGO_URI=mongodb+srv://admin:password123@cluster0.xxxxx.mongodb.net/campus-dating?retryWrites=true&w=majority
JWT_SECRET=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
FRONTEND_URL=https://campus-dating.vercel.app
CLOUDINARY_CLOUD_NAME=dxz8qy9ab
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
ADMIN_EMAIL=admin@campusdating.com
ADMIN_PASSWORD=SecurePassword123!
```

## 📝 Example Vercel Variables:

```
NEXT_PUBLIC_API_URL=https://campus-dating-production.up.railway.app
```

---

**After setting all these, redeploy both services and try again!**

