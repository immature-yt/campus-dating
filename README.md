# Campus Dating App

A modern dating app designed for college students to find study partners and meaningful connections.

## 🚀 Features

- **Profile Creation**: Multi-step registration with photo uploads and verification
- **Smart Matching**: Swipe-based matching with filters (gender, age, department, etc.)
- **Like System**: Like profiles and match when there's mutual interest
- **Real-time Chat**: Message your matches with text, voice notes, images, and videos
- **Admin Panel**: Comprehensive admin dashboard for user management and moderation
- **Verification System**: Photo ID and selfie verification for safety

## 📋 Prerequisites

Before deploying, ensure you have:

- **Node.js** (v18 or higher)
- **MongoDB** database (MongoDB Atlas for production)
- **Cloudinary** account for image storage
- **GitHub** account
- **Vercel** account (for frontend)
- **Railway/Render/Railway** account (for backend) or any Node.js hosting

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Storage**: Cloudinary for images
- **Authentication**: JWT tokens

## 📁 Project Structure

```
campus-dating/
├── frontend/          # Next.js frontend application
├── backend/           # Express.js backend API
├── .env.example       # Environment variables template
└── README.md          # This file
```

## ⚙️ Environment Variables

### Backend (.env)

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/campus-dating
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-admin-password
NODE_ENV=production
```

### Frontend (.env.local)

**⚠️ IMPORTANT**: For production, set this in **Vercel Environment Variables**, not in `.env.local` file!

In Vercel → Settings → Environment Variables:
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

For local development only, create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Note**: The `.env.local` file is gitignored and should NOT be committed!

## 🚀 Deployment Steps

### Step 1: Prepare Your Repository

1. **Initialize Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Create GitHub Repository**:
   - Go to GitHub and create a new repository
   - Don't initialize with README (we already have one)

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/your-username/campus-dating.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy Backend

#### Option A: Railway (Recommended)

1. **Create Railway Account**:
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Select the `backend` folder as the root

3. **Configure Environment Variables**:
   - Go to "Variables" tab
   - **CRITICAL**: Add ALL required environment variables (see checklist below)
   - **Important**: You MUST set all variables here, not in files!
   - Set `FRONTEND_URL` to your Vercel URL (get this after deploying frontend)
   - See `DEPLOYMENT_ENV_VARS.md` for complete list

**Required Variables for Railway:**
- `PORT` (usually 5000)
- `MONGO_URI` (MongoDB Atlas connection string)
- `JWT_SECRET` (strong random string, min 32 chars)
- `FRONTEND_URL` (your Vercel URL)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

4. **Deploy**:
   - Railway will auto-detect Node.js
   - It will run `npm install` and `npm start`
   - Wait for deployment to complete
   - Copy the deployment URL (e.g., `https://your-app.railway.app`)

#### Option B: Render

1. **Create Render Account**: [render.com](https://render.com)

2. **Create New Web Service**:
   - Connect your GitHub repository
   - Set root directory to `backend`
   - Build command: `npm install`
   - Start command: `npm start`
   - Add environment variables

3. **Get Backend URL**: Copy the URL after deployment

### Step 3: Deploy Frontend to Vercel

1. **Create Vercel Account**:
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**:
   - Click "Add New Project"
   - Import your GitHub repository
   - Set framework preset to "Next.js"
   - Set root directory to `frontend`

3. **Configure Environment Variables**:
   - Go to "Settings" → "Environment Variables"
   - Add: `NEXT_PUBLIC_API_URL` = your Railway backend URL from Step 2
   - Example: `https://your-app.railway.app`
   - **Important**: Select all environments (Production, Preview, Development)
   - **Redeploy** after adding environment variable!

4. **Deploy**:
   - Click "Deploy"
   - Wait for deployment
   - Copy your frontend URL (e.g., `https://campus-dating.vercel.app`)

### Step 4: Update Backend Frontend URL

1. **Go back to Railway/Render**:
   - Update `FRONTEND_URL` environment variable
   - Set it to your Vercel URL
   - Redeploy backend (or it will auto-redeploy)

2. **Update CORS Settings**:
   - Backend should already have CORS configured
   - Verify it accepts requests from your Vercel domain

### Step 5: Update Frontend API URL

1. **Go to Vercel Dashboard**:
   - Project → Settings → Environment Variables
   - Verify `NEXT_PUBLIC_API_URL` is set correctly
   - Redeploy if needed

## 🔧 Local Development Setup

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your values
npm start
```

Backend will run on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your values
npm run dev
```

Frontend will run on `http://localhost:3000`

## 📝 Important Notes

### Security

- **Never commit `.env` files** to Git
- Use strong JWT secrets in production
- Use secure admin passwords
- Enable HTTPS in production

### Database

- Use MongoDB Atlas for production (free tier available)
- Backup your database regularly
- Set up database indexes for performance

### Admin Access

- Admin user is auto-created on first deployment
- Use credentials from `ADMIN_EMAIL` and `ADMIN_PASSWORD`
- Access admin panel at `/admin`

## 🐛 Troubleshooting

### Chat Not Working

- Verify backend is deployed and accessible
- Check `NEXT_PUBLIC_API_URL` is correct in Vercel
- Check browser console for errors
- Verify MongoDB connection

### Images Not Uploading

- Verify Cloudinary credentials
- Check file size limits (max 5MB)
- Verify CORS settings

### Matches Not Showing

- Verify users are verified (`verification_status: 'approved'`)
- Check that users have mutual likes
- Verify database queries are working

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review backend logs in Railway/Render
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

## 📄 License

This project is private and proprietary.

## 🔐 Environment Variables Checklist

Before deploying, ensure you have:

- [ ] MongoDB connection string
- [ ] JWT secret (strong random string)
- [ ] Cloudinary credentials (cloud name, API key, API secret)
- [ ] Admin email and password
- [ ] Frontend URL (after Vercel deployment)
- [ ] Backend URL (after Railway/Render deployment)

## 🎯 Quick Deploy Checklist

1. [ ] Push code to GitHub
2. [ ] Set up MongoDB Atlas database
3. [ ] Set up Cloudinary account
4. [ ] Deploy backend to Railway/Render
5. [ ] Get backend URL
6. [ ] Deploy frontend to Vercel
7. [ ] Add `NEXT_PUBLIC_API_URL` to Vercel
8. [ ] Update `FRONTEND_URL` in backend
9. [ ] Test deployment
10. [ ] Access admin panel and verify users

---

**Good luck with your deployment! 🚀**
