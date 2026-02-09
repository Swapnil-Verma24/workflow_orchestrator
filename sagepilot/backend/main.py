from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from temporalio.client import Client
from sqlalchemy.orm import Session
import uuid
import asyncio
import json

# Import database components
from database import init_db, get_db
from models import SavedWorkflow

app = FastAPI(title="SagePilot Workflow Engine")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()
    print("✅ Database initialized")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store to track workflows (in-memory for now)
executions = {}
stored_workflows = {} # Added for webhook functionality

@app.post("/api/webhooks/{workflow_id}", status_code=202)
async def webhook_trigger(workflow_id: str, request: Request):
    """Trigger a workflow via webhook"""
    if workflow_id not in stored_workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow_def = stored_workflows[workflow_id]
    
    try:
        payload = await request.json()
    except:
        payload = {}

    try:
        # Connect to Temporal
        client = await Client.connect("localhost:7233")
        
        run_id = f"webhook-{uuid.uuid4()}"
        
        # Start workflow with payload
        handle = await client.start_workflow(
            "WorkflowExecution",
            args=[workflow_def, payload], # Pass payload as second argument
            id=run_id,
            task_queue="workflow-execution-queue"
        )
        
        # Store execution info
        executions[run_id] = {
            "run_id": run_id,
            "status": "running",
            "workflow_def": workflow_def,
            "trigger": "webhook",
            "initial_payload": payload
        }
        
        return {
            "run_id": run_id,
            "status": "pending",
            "message": "Workflow triggered via webhook"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/workflows")
async def save_workflow(workflow_def: dict):
    """Save a new workflow (Required for Webhook Trigger)"""
    workflow_id = str(uuid.uuid4())
    stored_workflows[workflow_id] = workflow_def
    return {"id": workflow_id, "message": "Workflow deployed successfully"}

@app.get("/")
async def root():
    return {"message": "SagePilot Workflow Engine", "status": "running"}

@app.post("/api/workflows/execute")
async def execute_workflow(workflow_def: dict):
    """Execute a workflow via Temporal"""
    try:
        # Connect to Temporal
        client = await Client.connect("localhost:7233")
        
        run_id = f"workflow-{uuid.uuid4()}"
        
        # Start workflow
        handle = await client.start_workflow(
            "WorkflowExecution",
            workflow_def,
            id=run_id,
            task_queue="workflow-execution-queue"
        )
        
        # Store execution info
        executions[run_id] = {
            "run_id": run_id,
            "status": "running",
            "workflow_def": workflow_def
        }
        
        return {
            "run_id": run_id,
            "status": "started",
            "workflow_id": run_id
        }
    except Exception as e:
        return {
            "error": str(e),
            "message": "Failed to start workflow. Is Temporal server running?"
        }

@app.get("/api/executions/{run_id}")
async def get_execution(run_id: str):
    """Get execution status and result"""
    try:
        client = await Client.connect("localhost:7233")
        handle = client.get_workflow_handle(run_id)
        
        # Try to get result (non-blocking check)
        try:
            result = await asyncio.wait_for(handle.result(), timeout=0.1)
            executions[run_id]["status"] = "completed"
            executions[run_id]["result"] = result
            return {
                "run_id": run_id,
                "status": "completed",
                "result": result
            }
        except asyncio.TimeoutError:
            return {
                "run_id": run_id,
                "status": "running"
            }
    except Exception as e:
        if run_id in executions:
            return executions[run_id]
        return {
            "error": str(e),
            "run_id": run_id,
            "status": "unknown"
        }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# TEst 
@app.post("/api/workflows/visualize")
async def visualize_workflow(workflow_def: dict):
    """Generate a visual representation of the workflow DAG"""
    nodes = workflow_def.get("nodes", [])
    edges = workflow_def.get("edges", [])
    
    # Create a simple ASCII representation
    ascii_graph = ["Workflow DAG:", "=" * 50, ""]
    
    # Build adjacency map
    node_map = {node["id"]: node for node in nodes}
    children_map = {}
    for edge in edges:
        if edge["source"] not in children_map:
            children_map[edge["source"]] = []
        children_map[edge["source"]].append(edge["target"])
    
    # Find root (node with no incoming edges)
    all_targets = {edge["target"] for edge in edges}
    roots = [node["id"] for node in nodes if node["id"] not in all_targets]
    
    def print_node(node_id, indent=0):
        node = node_map[node_id]
        prefix = "  " * indent + ("└─ " if indent > 0 else "")
        ascii_graph.append(f"{prefix}[{node['type']}] {node_id}")
        
        # Print children
        if node_id in children_map:
            for child_id in children_map[node_id]:
                print_node(child_id, indent + 1)
    
    # Build tree
    for root in roots:
        print_node(root)
    
    return {
        "ascii": "\n".join(ascii_graph),
        "nodes": nodes,
        "edges": edges,
        "execution_order": get_execution_order(nodes, edges)
    }

def get_execution_order(nodes, edges):
    """Get topological sort of nodes"""
    node_map = {node["id"]: node for node in nodes}
    all_targets = {edge["target"] for edge in edges}
    start_nodes = [node["id"] for node in nodes if node["id"] not in all_targets]
    
    if not start_nodes:
        return list(node_map.keys())
    
    order = []
    current = start_nodes[0]
    order.append(current)
    
    while True:
        next_edges = [e for e in edges if e["source"] == current]
        if not next_edges:
            break
        current = next_edges[0]["target"]
        order.append(current)
    
    return order

# ===== Workflow Database Persistence Endpoints =====

@app.post("/api/workflows/save")
async def save_workflow_to_db(workflow: dict, db: Session = Depends(get_db)):
    """Save a workflow to the database with a name"""
    workflow_name = workflow.get("name")
    workflow_data = workflow.get("workflow_data")
    
    if not workflow_name:
        raise HTTPException(status_code=400, detail="Workflow name is required")
    
    if not workflow_data:
        raise HTTPException(status_code=400, detail="Workflow data is required")
    
    # Check if workflow with this name already exists
    existing = db.query(SavedWorkflow).filter(SavedWorkflow.name == workflow_name).first()
    
    if existing:
        # Update existing workflow
        existing.workflow_data = json.dumps(workflow_data)
        db.commit()
        db.refresh(existing)
        return {"message": "Workflow updated successfully", "workflow_name": workflow_name}
    else:
        # Create new workflow
        new_workflow = SavedWorkflow(
            name=workflow_name,
            workflow_data=json.dumps(workflow_data)
        )
        db.add(new_workflow)
        db.commit()
        db.refresh(new_workflow)
        return {"message": "Workflow saved successfully", "workflow_name": workflow_name}

@app.get("/api/workflows/saved")
async def list_saved_workflows(db: Session = Depends(get_db)):
    """List all saved workflows (names and metadata only)"""
    workflows = db.query(SavedWorkflow).all()
    return {
        "workflows": [
            {
                "name": wf.name,
                "created_at": wf.created_at.isoformat() if wf.created_at else None,
                "updated_at": wf.updated_at.isoformat() if wf.updated_at else None
            }
            for wf in workflows
        ]
    }

@app.get("/api/workflows/saved/{workflow_name}")
async def load_workflow_from_db(workflow_name: str, db: Session = Depends(get_db)):
    """Load a specific workflow by name"""
    workflow = db.query(SavedWorkflow).filter(SavedWorkflow.name == workflow_name).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return workflow.to_dict()

@app.delete("/api/workflows/saved/{workflow_name}")
async def delete_workflow_from_db(workflow_name: str, db: Session = Depends(get_db)):
    """Delete a workflow by name"""
    workflow = db.query(SavedWorkflow).filter(SavedWorkflow.name == workflow_name).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    db.delete(workflow)
    db.commit()
    
    return {"message": f"Workflow '{workflow_name}' deleted successfully"}