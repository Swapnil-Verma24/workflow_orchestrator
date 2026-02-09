from temporalio import workflow
from datetime import timedelta
from .activities import (
    execute_manual_trigger,
    execute_transform_data,
    execute_end,
    decision_node,
    execute_webhook_trigger,
    execute_http_request
)

@workflow.defn
class WorkflowExecution:
    @workflow.run
    async def run(self, workflow_def: dict, input_payload: dict = None) -> dict:
        """Execute workflow following edges, with decision_node overrides for routing"""
        execution_trace = []
        
        # Build node lookup
        nodes = {node["id"]: node for node in workflow_def["nodes"]}
        edges = workflow_def["edges"]
        
        # Find starting node (either manual or webhook)
        start_node = next((n for n in workflow_def["nodes"] if n["type"] in ["manual_trigger", "webhook_trigger"]), None)
        if not start_node:
            raise ValueError("No valid start node (manual_trigger or webhook_trigger) found")
        
        current_node_id = start_node["id"]
        current_payload = input_payload # Use input payload if provided (for webhook)
        
        # Execute nodes following edges
        while current_node_id:
            if current_node_id not in nodes:
                raise ValueError(f"Node '{current_node_id}' not found in workflow definition")
            
            node = nodes[current_node_id]
            node_type = node["type"]
            config = node.get("config", {})
            
            # Execute activity based on node type
            if node_type == "manual_trigger":
                current_payload = await workflow.execute_activity(
                    execute_manual_trigger,
                    args=[config, current_payload],
                    start_to_close_timeout=timedelta(seconds=30)
                )

            elif node_type == "webhook_trigger":
                current_payload = await workflow.execute_activity(
                    execute_webhook_trigger,
                    args=[config, current_payload],
                    start_to_close_timeout=timedelta(seconds=30)
                )
                
            elif node_type == "http_request":
                current_payload = await workflow.execute_activity(
                    execute_http_request,
                    args=[config, current_payload],
                    start_to_close_timeout=timedelta(seconds=30)
                )

            elif node_type == "wait":
                import asyncio
                duration = config.get("duration", 0)
                unit = config.get("unit", "seconds")
                if unit == "minutes":
                    duration *= 60
                await asyncio.sleep(duration)
                # Payload remains the same after wait
                
            elif node_type == "transform_data":
                current_payload = await workflow.execute_activity(
                    execute_transform_data,
                    args=[config, current_payload],
                    start_to_close_timeout=timedelta(seconds=30)
                )
                
            elif node_type == "decision_node":
                # Decision node returns next_node + payload
                result = await workflow.execute_activity(
                    decision_node,
                    args=[config, current_payload],
                    start_to_close_timeout=timedelta(seconds=30)
                )
                current_payload = result.get("payload", current_payload)
                next_node_id = result.get("next_node")
                
                # Log decision result
                execution_trace.append({
                    "step": len(execution_trace) + 1,
                    "node_id": current_node_id,
                    "node_type": node_type,
                    "output": current_payload,
                    "next_node": next_node_id
                })
                # Jump to decision result (override edges)
                current_node_id = next_node_id
                continue
                
            elif node_type == "end":
                current_payload = await workflow.execute_activity(
                    execute_end,
                    args=[config, current_payload],
                    start_to_close_timeout=timedelta(seconds=30)
                )
                # End node stops execution
                execution_trace.append({
                    "step": len(execution_trace) + 1,
                    "node_id": current_node_id,
                    "node_type": node_type,
                    "output": current_payload,
                    "next_node": None
                })
                break
            
            # Log execution step (for non-decision nodes)
            # Get next node from edges
            next_edges = [e for e in edges if e["source"] == current_node_id]
            next_node_id = next_edges[0]["target"] if next_edges else None
            
            execution_trace.append({
                "step": len(execution_trace) + 1,
                "node_id": current_node_id,
                "node_type": node_type,
                "output": current_payload,
                "next_node": next_node_id
            })
            
            current_node_id = next_node_id
        
        return {
            "status": "completed",
            "final_output": current_payload,
            "execution_trace": execution_trace
        }
