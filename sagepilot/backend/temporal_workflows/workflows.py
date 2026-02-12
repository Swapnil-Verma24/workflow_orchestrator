from temporalio import workflow
from datetime import timedelta
from .activities import (
    execute_manual_trigger,
    execute_transform_data,
    execute_end,
    evaluate_decision,
    execute_webhook_trigger,
    execute_http_request
)

@workflow.defn
class WorkflowExecution:
    @workflow.run
    async def run(self, workflow_def: dict, input_payload: dict = None) -> dict:
        """Execute workflow using topological-style traversal for DAG support"""
        execution_trace = []
        
        # Build node and adjacency lookup
        nodes = {node["id"]: node for node in workflow_def["nodes"]}
        edges = workflow_def["edges"]
        
        # Build adjacency list and calculate initial in-degrees
        adj_list = {}
        in_degree = {node_id: 0 for node_id in nodes}
        for edge in edges:
            src = edge["source"]
            tgt = edge["target"]
            if src not in adj_list: adj_list[src] = []
            adj_list[src].append(edge)
            in_degree[tgt] += 1
            
        # Find starting node (either manual or webhook)
        start_node = next((n for n in workflow_def["nodes"] if n["type"] in ["manual_trigger", "webhook_trigger"]), None)
        if not start_node:
            return {
                "status": "failed",
                "error": "No valid start node (manual_trigger or webhook_trigger) found",
                "execution_trace": execution_trace
            }
        
        # Store latest payload for each edge/node
        node_payloads = {start_node["id"]: input_payload}
        
        # Queue of nodes ready to be executed
        ready_queue = [start_node["id"]]
        executed_nodes = set()
        skipped_nodes = set()

        try:
            while ready_queue:
                current_node_id = ready_queue.pop(0)
                if current_node_id in executed_nodes or current_node_id in skipped_nodes:
                    continue
                    
                node = nodes[current_node_id]
                node_type = node["type"]
                config = node.get("config", {})
                current_payload = node_payloads.get(current_node_id)
                
                node_error = None
                node_result_payload = current_payload
                
                try:
                    from temporalio.common import RetryPolicy
                    
                    # Custom retry policy for HTTP requests
                    http_retry_policy = RetryPolicy(
                        initial_interval=timedelta(seconds=1),
                        backoff_coefficient=2.0,
                        maximum_interval=timedelta(seconds=30),
                        maximum_attempts=3,
                        non_retryable_error_types=["HTTPStatusError", "ValidationError", "TemplateError"]
                    )

                    # Execute activity based on node type
                    if node_type == "manual_trigger":
                        node_result_payload = await workflow.execute_activity(
                            execute_manual_trigger,
                            args=[config, current_payload],
                            start_to_close_timeout=timedelta(seconds=30)
                        )

                    elif node_type == "webhook_trigger":
                        node_result_payload = await workflow.execute_activity(
                            execute_webhook_trigger,
                            args=[config, current_payload],
                            start_to_close_timeout=timedelta(seconds=30)
                        )
                        
                    elif node_type == "http_request":
                        result = await workflow.execute_activity(
                            execute_http_request,
                            args=[config, current_payload],
                            start_to_close_timeout=timedelta(seconds=30),
                            retry_policy=http_retry_policy
                        )
                        if isinstance(result, dict) and result.get("status") == "failed":
                            node_error = result.get("error")
                            node_status = "failed"
                        node_result_payload = result

                    elif node_type == "wait":
                        duration = config.get("duration", 0)
                        unit = config.get("unit", "seconds")
                        if unit == "minutes": duration *= 60
                        await workflow.sleep(timedelta(seconds=duration))
                        
                    elif node_type == "transform_data":
                        result = await workflow.execute_activity(
                            execute_transform_data,
                            args=[config, current_payload],
                            start_to_close_timeout=timedelta(seconds=30)
                        )
                        if isinstance(result, dict) and result.get("status") == "failed":
                            node_error = result.get("error")
                            node_status = "failed"
                        node_result_payload = result
                        
                    elif node_type == "decision_node":
                        result = await workflow.execute_activity(
                            evaluate_decision,
                            args=[config, current_payload],
                            start_to_close_timeout=timedelta(seconds=30)
                        )
                        condition_met = result.get("condition_met", False)
                        node_error = result.get("error")
                        node_status = "failed" if node_error else "completed"
                        node_result_payload = result.get("payload", current_payload)
                        
                        executed_nodes.add(current_node_id)
                        
                        # Handle branching
                        desired_port = "true" if condition_met else "false"
                        out_edges = adj_list.get(current_node_id, [])
                        next_node_id = None
                        
                        for edge in out_edges:
                            target = edge["target"]
                            if edge.get("sourceHandle") == desired_port:
                                node_payloads[target] = node_result_payload
                                next_node_id = target
                                in_degree[target] -= 1
                                if in_degree[target] == 0:
                                    ready_queue.append(target)
                            else:
                                self._mark_subtree_skipped(target, adj_list, in_degree, skipped_nodes, ready_queue)

                        execution_trace.append({
                            "step": len(execution_trace) + 1,
                            "node_id": current_node_id,
                            "node_type": node_type,
                            "condition_met": condition_met,
                            "error": node_error,
                            "status": node_status,
                            "output": node_result_payload,
                            "next_node": next_node_id
                        })
                        if node_status == "failed":
                             return {
                                "status": "failed",
                                "error": node_error,
                                "execution_trace": execution_trace
                            }
                        continue
                        
                    elif node_type == "end":
                        node_result_payload = await workflow.execute_activity(
                            execute_end,
                            args=[config, current_payload],
                            start_to_close_timeout=timedelta(seconds=30)
                        )
                        executed_nodes.add(current_node_id)
                        execution_trace.append({
                            "step": len(execution_trace) + 1,
                            "node_id": current_node_id,
                            "node_type": node_type,
                            "output": node_result_payload,
                            "next_node": None
                        })
                        continue
                    
                    # For generic nodes, propagate payload to ALL children
                    executed_nodes.add(current_node_id)
                    out_edges = adj_list.get(current_node_id, [])
                    for edge in out_edges:
                        target = edge["target"]
                        node_payloads[target] = node_result_payload
                        in_degree[target] -= 1
                        if in_degree[target] == 0:
                            ready_queue.append(target)
                            
                    execution_trace.append({
                        "step": len(execution_trace) + 1,
                        "node_id": current_node_id,
                        "node_type": node_type,
                        "error": node_error,
                        "output": node_result_payload,
                        "next_node": out_edges[0]["target"] if out_edges else None
                    })

                except Exception as node_ex:
                    execution_trace.append({
                        "step": len(execution_trace) + 1,
                        "node_id": current_node_id,
                        "node_type": node_type,
                        "error": str(node_ex),
                        "status": "failed"
                    })
                    raise node_ex
                    
        except Exception as workflow_ex:
             return {
                "status": "failed",
                "error": str(workflow_ex),
                "final_output": node_payloads.get(start_node["id"]),
                "execution_trace": execution_trace
            }
        
        final_output = execution_trace[-1]["output"] if execution_trace else {}
        
        return {
            "status": "completed",
            "final_output": final_output,
            "execution_trace": execution_trace
        }

    def _mark_subtree_skipped(self, node_id, adj_list, in_degree, skipped_nodes, ready_queue):
        """Recursively mark nodes as skipped and propagate to children"""
        if node_id in skipped_nodes: return
        
        skipped_nodes.add(node_id)
        in_degree[node_id] -= 1
        if in_degree[node_id] == 0:
            for edge in adj_list.get(node_id, []):
                self._mark_subtree_skipped(edge["target"], adj_list, in_degree, skipped_nodes, ready_queue)
