# Free Tier Deployment Solution ✅

## Problem Solved: Embedded Worker Pattern

The free tier challenge has been **solved** with the Embedded Worker pattern!

### The Solution

Instead of running the Temporal worker as a separate process (which gets spun down), we run it **in the same process as the FastAPI backend**. When any API request comes in, the entire service (API + Worker) wakes up together.

### How It Works

```
┌─────────────────────────────────┐
│   Render Free Tier Web Service  │
│                                 │
│  ┌──────────────────────────┐  │
│  │   FastAPI Server (API)   │  │
│  │          +               │  │
│  │  Temporal Worker (BG)    │  │
│  └──────────────────────────┘  │
│                                 │
│  Single Process = No Spindown  │
│  Issues Between Components!     │
└─────────────────────────────────┘
```

### Benefits

✅ **Works on Free Tier**: Single web service stays alive together
✅ **No Missing Workers**: Worker starts when API starts
✅ **Simple Deployment**: One service instead of two
✅ **Cost Effective**: Completely free (with Temporal Cloud free tier)

### Implementation Files

1. **[embedded_worker.py](file:///C:/Users/swapn/OneDrive/Desktop/assignment/workflow_orchestrator/sagepilot/backend/embedded_worker.py)** - Worker runs as background asyncio task
2. **[main.py](file:///C:/Users/swapn/OneDrive/Desktop/assignment/workflow_orchestrator/sagepilot/backend/main.py#L24-L29)** - Starts worker on app startup if `EMBEDDED_WORKER=true`
3. **[render.yaml](file:///C:/Users/swapn/OneDrive/Desktop/assignment/workflow_orchestrator/render.yaml)** - Updated to single service with `EMBEDDED_WORKER=true`

---

## Deployment Steps (Updated)

### Option 1: Full Free Deployment (Recommended)

**Services Required**:
- Frontend: Vercel (Free)
- Backend: Render Web Service (Free) - with embedded worker
- Temporal: Temporal Cloud (Free tier - 1000 actions/month)

**Steps**:

1. **Sign up for Temporal Cloud**
   - Go to https://cloud.temporal.io/
   - Create free account
   - Create a namespace (e.g., `my-workflow-engine`)
   - Get connection string: `<namespace>.tmprl.cloud:7233`

2. **Deploy Frontend to Vercel**
   ```bash
   cd sagepilot/frontend
   vercel --prod
   ```
   - Get URL (e.g., `https://your-app.vercel.app`)

3. **Deploy Backend to Render**
   - Go to https://render.com/
   - Click "New +" → "Web Service"
   - Connect your Git repository
   - Configure:
     - **Root Directory**: `workflow_orchestrator`
     - **Build Command**: `pip install -r sagepilot/requirements.txt`
     - **Start Command**: `python -m uvicorn sagepilot.backend.main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     ```
     DATABASE_URL=sqlite:///./workflows.db
     TEMPORAL_HOST=<your-namespace>.tmprl.cloud:7233
     TEMPORAL_NAMESPACE=default
     TASK_QUEUE=workflow-execution-queue
     EMBEDDED_WORKER=true    ← This is the key!
     ```
   - Click "Create Web Service"

4. **Update Frontend Environment**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Set `VITE_API_URL` = Your Render backend URL
   - Redeploy frontend

5. **Test End-to-End**
   - Visit your Vercel URL
   - Create a workflow
   - Execute it
   - ✅ Should work perfectly!

### Limitations

⚠️ **Free tier still has cold starts**: After 15 minutes of inactivity, first request takes 30-60 seconds to wake up both API and worker. Subsequent requests are fast.

✅ **But workflows execute successfully**: Once awake, everything works normally!

---

## Option 2: Testing Embedded Worker Locally

Want to test the embedded worker pattern on your local machine?

```bash
# Set environment variable
$env:EMBEDDED_WORKER="true"  # Windows PowerShell

# Run backend (worker will start automatically)
cd workflow_orchestrator
.venv\Scripts\python.exe -m uvicorn sagepilot.backend.main:app --reload

# You should see:
# ✅ Database initialized
# 🔧 Embedded worker mode enabled - starting worker in background...
# 🔄 Connecting to Temporal at localhost:7233...
# 🚀 Starting embedded Temporal worker on queue: workflow-execution-queue
# ✅ Embedded Temporal worker is running!
```

**Note**: You still need Temporal server running (`temporal server start-dev`)

To go back to separate worker mode:
```bash
$env:EMBEDDED_WORKER="false"
# Then run worker separately as before
```

---

## Cost Breakdown (With Embedded Worker)

**100% FREE Option**:
- Vercel Frontend: $0/month ✅
- Render Backend (with embedded worker): $0/month ✅
- Temporal Cloud Free Tier: $0/month ✅ (1000 actions/month)

**Limitations**:
- Cold starts after 15 min idle
- 1000 workflow actions per month limit
- Single web service may be restarted occasionally

**Upgrade Path** (if needed):
- Render Starter (always-on): $7/month
- Temporal Cloud Paid: $200/month (25K actions)

---

## Comparison: Embedded vs Separate Worker

| Aspect | Embedded Worker | Separate Worker |
|--------|----------------|-----------------|
| **Free Tier Compatibility** | ✅ Excellent | ❌ Poor (spins down separately) |
| **Startup Time** | Fast (single process) | Slower (two processes) |
| **Resource Usage** | Lower (shared memory) | Higher (separate processes) |
| **Isolation** | Lower (same process) | Higher (separate processes) |
| **Best For** | Development, Demo, Free Tiers | Production, High Traffic |

---

## Next Steps

1. **Choose your Temporal provider**:
   - Temporal Cloud free tier (recommended)
   - Self-hosted (not recommended for free tier)

2. **Deploy frontend to Vercel**

3. **Deploy backend to Render** with `EMBEDDED_WORKER=true`

4. **Enjoy your free, fully functional workflow automation system!** 🎉

The spindown problem is **solved** with this architectural pattern!
