"""
Embedded Temporal Worker for Production Deployment

This module starts a Temporal worker in a background asyncio task,
allowing it to run in the same process as the FastAPI server.

This solves the free-tier deployment issue where separate worker processes
get spun down after 15 minutes of inactivity.
"""
import asyncio
import os
from temporalio.client import Client
from temporalio.worker import Worker
from sagepilot.backend.temporal_workflows.workflows import WorkflowExecution
from sagepilot.backend.temporal_workflows.activities import (
    execute_manual_trigger,
    execute_transform_data,
    execute_end,
    evaluate_decision,
    execute_webhook_trigger,
    execute_http_request
)

_worker_task = None

async def start_embedded_worker():
    """
    Start Temporal worker as a background task.
    This allows the worker to run in the same process as FastAPI.
    """
    global _worker_task
    
    # Get Temporal host from environment or use default
    temporal_host = os.getenv("TEMPORAL_HOST", "localhost:7233")
    task_queue = os.getenv("TASK_QUEUE", "workflow-execution-queue")
    
    try:
        print(f"🔄 Connecting to Temporal at {temporal_host}...")
        client = await Client.connect(temporal_host)
        
        print(f"🚀 Starting embedded Temporal worker on queue: {task_queue}")
        worker = Worker(
            client,
            task_queue=task_queue,
            workflows=[WorkflowExecution],
            activities=[
                execute_manual_trigger,
                execute_transform_data,
                execute_end,
                evaluate_decision,
                execute_webhook_trigger,
                execute_http_request
            ]
        )
        
        print("✅ Embedded Temporal worker is running!")
        await worker.run()
        
    except Exception as e:
        print(f"❌ Failed to start embedded worker: {e}")
        print("⚠️  Workflows will not execute until worker is running")
        # Don't crash the entire app if worker fails to start
        # This allows the API to still serve requests

async def start_worker_background():
    """
    Start the worker in a background task that won't block FastAPI startup.
    """
    global _worker_task
    if _worker_task is None:
        _worker_task = asyncio.create_task(start_embedded_worker())
        print("🔧 Embedded worker task created")

def is_embedded_mode():
    """
    Check if we should run in embedded mode.
    Set EMBEDDED_WORKER=true in production environments.
    """
    return os.getenv("EMBEDDED_WORKER", "false").lower() in ("true", "1", "yes")
