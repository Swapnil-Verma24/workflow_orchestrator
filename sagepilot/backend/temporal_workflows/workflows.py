from temporalio import workflow
from datetime import timedelta
from .activities import (
    execute_manual_trigger,
    execute_transform_data,
    execute_end
)

@workflow.defn
class WorkflowExecution:
    @workflow.run
    async def run(self, workflow_def: dict) -> dict:
        """Execute workflow nodes in order"""
        execution_trace = []
        
        # Simple linear execution for now (trigger -> process -> end)
        nodes = {node["id"]: node for node in workflow_def["nodes"]}
        edges = workflow_def["edges"]
        
        # Build execution order from edges
        execution_order = self._get_execution_order(nodes, edges)
        
        current_payload = None
        
        for node_id in execution_order:
            node = nodes[node_id]
            node_type = node["type"]
            config = node.get("config", {})
            
            # Execute based on node type
            if node_type == "manual_trigger":
                result = await workflow.execute_activity(
                    execute_manual_trigger,
                    args=[config, current_payload],
                    start_to_close_timeout=timedelta(seconds=30)
                )
            elif node_type == "transform_data":
                result = await workflow.execute_activity(
                    execute_transform_data,
                    args=[config, current_payload],
                    start_to_close_timeout=timedelta(seconds=30)
                )
            elif node_type == "end":
                result = await workflow.execute_activity(
                    execute_end,
                    args=[config, current_payload],
                    start_to_close_timeout=timedelta(seconds=30)
                )
            else:
                result = current_payload
            
            # Log step
            execution_trace.append({
                "step": len(execution_trace) + 1,
                "node_id": node_id,
                "node_type": node_type,
                "output": result
            })
            
            current_payload = result
        
        return {
            "status": "completed",
            "final_output": current_payload,
            "execution_trace": execution_trace
        }
    
    def _get_execution_order(self, nodes: dict, edges: list) -> list:
        """Simple topological sort"""
        # Find starting node (no incoming edges)
        all_targets = {edge["target"] for edge in edges}
        start_nodes = [nid for nid in nodes.keys() if nid not in all_targets]
        
        if not start_nodes:
            return list(nodes.keys())
        
        # Build order by following edges
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