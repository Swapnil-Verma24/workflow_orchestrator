# Deployment Guide - Free Hosting

This guide walks you through deploying the workflow automation system to free hosting platforms.

## 🎯 Deployment Architecture

- **Frontend**: Vercel (Free tier - recommended)
- **Backend**: Render (Free tier)
- **Temporal**: Temporal Cloud (Free tier) or Railway (with limitations)
- **Database**: SQLite (file-based, included with backend)

---

## ⚠️ Important Notes

**Temporal Limitations on Free Hosting**:
- Temporal requires persistent worker processes
- Free tiers have sleep/restart policies that can interrupt workers
- **Recommended**: Use Temporal Cloud free tier for production reliability
- **Alternative**: Note in README that live demo has limitations due to Temporal infrastructure

---

## 📋 Prerequisites

1. GitHub account (for code repository)
2. Vercel account (sign up at vercel.com)
3. Render account (sign up at render.com)
4. Temporal Cloud account (sign up at cloud.temporal.io) - Optional but recommended

---

## Part 1: Deploy Frontend to Vercel

### Step 1: Prepare Frontend for Deployment

1. **Update API URL for production**:
   
   Edit `sagepilot/frontend/.env.production`:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   ```
   (You'll get this URL after deploying the backend)

2. **Create Vercel configuration** (already provided in this repo):
   - `vercel.json` configures build settings
   - Build command: `npm run build`
   - Output directory: `dist`

### Step 2: Deploy to Vercel

**Option A: Via Vercel Dashboard (Easiest)**
1. Go to https://vercel.com/
2. Click "Add New Project"
3. Import your Git repository
4. Select the `sagepilot/frontend` folder as the root directory
5. Framework preset: "Vite"
6. Environment variables:
   - `VITE_API_URL` = (will update after backend deployment)
7. Click "Deploy"

**Option B: Via Vercel CLI**
```bash
cd sagepilot/frontend
npm install -g vercel
vercel login
vercel --prod
```

### Step 3: Get Frontend URL
After deployment, you'll get a URL like: `https://your-app.vercel.app`

---

## Part 2: Deploy Backend to Render

### Step 1: Prepare Backend for Deployment

1. **Dependencies file** (already in repo):
   - `sagepilot/requirements.txt` contains all Python packages

2. **Start command**:
   We'll use: `python -m uvicorn sagepilot.backend.main:app --host 0.0.0.0 --port $PORT`

### Step 2: Create Web Service on Render

1. Go to https://render.com/
2. Click "New +" → "Web Service"
3. Connect your Git repository
4. Configure:
   - **Name**: workflow-automation-backend
   - **Root Directory**: `workflow_orchestrator`
   - **Environment**: Python 3
   - **Build Command**: `pip install -r sagepilot/requirements.txt`
   - **Start Command**: `python -m uvicorn sagepilot.backend.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free

5. **Environment Variables**:
   ```
   DATABASE_URL=sqlite:///./workflows.db
   TEMPORAL_HOST=<your-temporal-cloud-address>:7233
   TEMPORAL_NAMESPACE=default
   TASK_QUEUE=workflow-execution-queue
   ```

6. Click "Create Web Service"

### Step 3: Deploy Worker (IMPORTANT!)

The Temporal worker needs to run continuously. On Render:

1. Create a **Background Worker** service (not Web Service)
2. Configure:
   - **Name**: workflow-automation-worker
   - **Environment**: Python 3
   - **Build Command**: `pip install -r sagepilot/requirements.txt`
   - **Start Command**: `python -m sagepilot.backend.temporal_workflows.worker`
   
3. **Environment Variables** (same as backend):
   ```
   TEMPORAL_HOST=<your-temporal-cloud-address>:7233
   TEMPORAL_NAMESPACE=default
   TASK_QUEUE=workflow-execution-queue
   ```

⚠️ **Free Tier Limitation**: Render's free tier spins down after 15 minutes of inactivity. This will interrupt the worker. Solutions:
- Upgrade to paid tier ($7/month)
- Use Temporal Cloud
- Note limitation in README

---

## Part 3: Setup Temporal Cloud (Recommended)

### Option A: Temporal Cloud (Recommended for Production)

1. Sign up at https://cloud.temporal.io/
2. Create a new namespace
3. Get connection details:
   - **Address**: `<namespace>.tmprl.cloud:7233`
   - **Namespace**: Your namespace name
4. Update environment variables in Render with these values

### Option B: Self-Hosted Temporal (Not Recommended for Free Tier)

**Warning**: Self-hosting Temporal on free tiers is extremely difficult due to:
- Requires multiple services (server, UI, database)
- Persistent storage requirements
- Always-on requirement

If you must try, use Railway:
1. Deploy Temporal server using Docker
2. Keep in mind it may be unstable on free tier

---

## Part 4: Connect Everything

### Step 1: Update Frontend Environment

1. Go to Vercel dashboard
2. Settings → Environment Variables
3. Update `VITE_API_URL` with your Render backend URL
4. Redeploy: `vercel --prod` or use dashboard

### Step 2: Update CORS in Backend

In `sagepilot/backend/main.py`, update allowed origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://your-app.vercel.app"  # Add your Vercel URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Commit and push - Render will auto-deploy.

---

## Part 5: Verify Deployment

### Test Checklist:

1. ✅ Visit your Vercel frontend URL
2. ✅ Open browser DevTools → Network tab
3. ✅ Check API calls go to Render backend
4. ✅ Create a simple workflow in the UI
5. ✅ Run the workflow
6. ✅ Check execution completes successfully

---

## 🚨 Common Issues & Solutions

### Issue: "Failed to fetch" errors in frontend
- **Cause**: CORS or wrong API URL
- **Solution**: Check VITE_API_URL points to Render backend, verify CORS settings

### Issue: Workflow execution fails
- **Cause**: Worker not running or Temporal not connected
- **Solution**: 
  - Check Render worker logs
  - Verify Temporal Cloud credentials
  - Ensure worker is running continuously

### Issue: Worker keeps restarting
- **Cause**: Render free tier spins down inactive services
- **Solution**: 
  - Upgrade to paid tier
  - Use Temporal Cloud with cron job to keep warm
  - Accept limitation and note in README

### Issue: SQLite database resets
- **Cause**: Render's free tier filesystem is ephemeral
- **Solution**:
  - Upgrade to paid tier with persistent disk
  - Switch to PostgreSQL (Render offers free 90-day trial)
  - Accept as limitation for demo purposes

---

## 💰 Cost Summary

**100% Free Option** (with limitations):
- Vercel Frontend: Free ✅
- Render Backend: Free ✅ (spins down after 15min)
- Render Worker: Free ✅ (spins down after 15min)
- Temporal Cloud: Free tier ✅ (limited to 1000 actions/month)
- **Limitation**: Services spin down, first request slow, worker may disconnect

**Recommended Production Option** ($7-15/month):
- Vercel Frontend: Free ✅
- Render Backend: $7/month (always on)
- Render Worker: $7/month (always on)
- Temporal Cloud: Free tier ✅
- **Benefit**: Reliable, always available

---

## 📝 Alternative: Walkthrough Video Only

Given Temporal's infrastructure requirements, the assignment states:

> "If a live demo is not feasible due to Temporal infrastructure constraints, the walkthrough video is acceptable as the primary demo. Please note this in your README."

**Recommendation**: 
1. Create a comprehensive walkthrough video showing local deployment
2. Add note to README explaining Temporal deployment challenges
3. Optionally deploy frontend+backend to show the UI (without full Temporal)

This is **perfectly acceptable** per assignment requirements.

---

## 🎬 Next Steps

Choose your deployment path:

**Path 1: Full Deployment** (requires some paid services for reliability)
- Follow Parts 1-4 above
- Use Temporal Cloud free tier
- Note limitations in README

**Path 2: Frontend + Backend Only** (fully free)
- Deploy frontend to Vercel
- Deploy backend to Render (API only, without worker)
- Document that Temporal requires local setup
- Create walkthrough video

**Path 3: Walkthrough Video** (recommended by assignment)
- Record 5-8 minute demo of local system
- Upload to Loom/YouTube
- Include in README
- This is explicitly allowed per assignment
