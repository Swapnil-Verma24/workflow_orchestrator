# Procfile for platforms like Railway or Heroku
# Defines how to run different processes

web: python -m uvicorn sagepilot.backend.main:app --host 0.0.0.0 --port $PORT
worker: python -m sagepilot.backend.temporal_workflows.worker
