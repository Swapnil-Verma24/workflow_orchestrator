# Configuration Separation: Local vs Deployment

This document explains how the codebase maintains clean separation between local development and production deployment.

## 📁 Configuration Files

### Local Development
- **`.env.example`** - Environment variables for local development
  - `EMBEDDED_WORKER=false` - Worker runs as separate process
  - `TEMPORAL_HOST=localhost:7233` - Local Temporal server
  - `VITE_API_URL=http://localhost:8000` - Local backend

### Production Deployment  
- **`.env.production.example`** - Environment variables for deployment platforms
  - `EMBEDDED_WORKER=true` - Worker runs in same process as API
  - `TEMPORAL_HOST=<namespace>.tmprl.cloud:7233` - Temporal Cloud
  - Production URLs from hosting platform

## 🔄 How It Works

The codebase automatically adapts based on the `EMBEDDED_WORKER` environment variable:

### Local Mode (EMBEDDED_WORKER=false)
```
Terminal 1: temporal server start-dev
Terminal 2: python -m uvicorn sagepilot.backend.main:app --reload
Terminal 3: python -m sagepilot.backend.temporal_workflows.worker
Terminal 4: npm run dev  (in frontend directory)
```

**Behavior**:
- FastAPI starts without worker
- Separate worker process connects to local Temporal
- Easy debugging (can restart worker independently)
- All services visible in separate terminals

### Deployment Mode (EMBEDDED_WORKER=true)
```
Single Service: python -m uvicorn sagepilot.backend.main:app --host 0.0.0.0 --port $PORT
```

**Behavior**:
- FastAPI starts embedded worker in background task
- Worker lifecycle tied to API server
- Solves free tier spin-down issues
- Simpler deployment (one service instead of two)

## 🎯 Key Files

### Backend Logic
- **[embedded_worker.py](sagepilot/backend/embedded_worker.py)** - Embedded worker implementation
- **[main.py:L24-29](sagepilot/backend/main.py#L24-L29)** - Startup logic checks environment variable
- **[worker.py](sagepilot/backend/temporal_workflows/worker.py)** - Standalone worker for local dev

### Deployment Configs
- **[render.yaml](render.yaml)** - Render deployment with EMBEDDED_WORKER=true
- **[Procfile](Procfile)** - Railway/Heroku process definitions
- **[vercel.json](sagepilot/frontend/vercel.json)** - Frontend deployment config

## ✅ Benefits of This Approach

1. **No code duplication** - Same codebase for both modes
2. **Environment-driven** - Simple flag controls behavior
3. **Safe defaults** - Local mode is default, deployment requires explicit flag
4. **Easy testing** - Can test embedded mode locally by setting `EMBEDDED_WORKER=true`
5. **Clear documentation** - Separate files for each mode

## 🧪 Testing Both Modes Locally

### Test Local Mode (Default)
```bash
# Don't set EMBEDDED_WORKER or set it to false
python -m uvicorn sagepilot.backend.main:app --reload
# Should see: "ℹ️ Embedded worker mode disabled - run worker separately"

# In another terminal:
python -m sagepilot.backend.temporal_workflows.worker
```

### Test Embedded Mode
```bash
# PowerShell
$env:EMBEDDED_WORKER="true"
python -m uvicorn sagepilot.backend.main:app --reload
# Should see: "🔧 Embedded worker mode enabled - starting worker in background..."
# Should see: "✅ Embedded Temporal worker is running!"
```

## 📝 Summary

- **Local development**: Separate services for flexibility (default)
- **Production deployment**: Embedded worker for free tier compatibility
- **Single codebase**: Adapts based on environment variable
- **No deployment conflicts**: Configs are clearly separated
