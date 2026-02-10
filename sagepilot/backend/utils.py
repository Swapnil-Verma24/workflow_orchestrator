"""
Utility functions for workflow validation and processing
"""
from typing import List, Dict, Tuple, Optional
from collections import deque, defaultdict


def check_cycle_and_get_order(nodes: List[Dict], edges: List[Dict]) -> Tuple[bool, Optional[List[str]], Optional[str]]:
    """
    Check if workflow has cycles using Kahn's Algorithm (Topological Sort)
    
    Args:
        nodes: List of node dictionaries with 'id' field
        edges: List of edge dictionaries with 'source' and 'target' fields
    
    Returns:
        Tuple of (has_cycle, execution_order, error_message)
        - has_cycle: True if cycle exists, False otherwise
        - execution_order: List of node IDs in topological order (None if cycle exists)
        - error_message: Error description (None if no cycle)
    
    Algorithm:
        1. Calculate in-degree for each node
        2. Add all nodes with in-degree 0 to queue
        3. Process queue: remove node, decrease neighbors' in-degrees
        4. If all nodes processed → DAG, return order
        5. If nodes remain → cycle detected
    """
    if not nodes:
        return False, [], None
    
    # Build adjacency list and in-degree map
    adj_list = defaultdict(list)
    in_degree = {node['id']: 0 for node in nodes}
    
    # Build graph
    for edge in edges:
        source = edge.get('source')
        target = edge.get('target')
        
        if source and target:
            adj_list[source].append(target)
            in_degree[target] += 1
    
    # Find all nodes with in-degree 0 (starting nodes)
    queue = deque([node_id for node_id, degree in in_degree.items() if degree == 0])
    
    execution_order = []
    
    # Kahn's algorithm
    while queue:
        # Remove node from queue
        current = queue.popleft()
        execution_order.append(current)
        
        # Decrease in-degree of neighbors
        for neighbor in adj_list[current]:
            in_degree[neighbor] -= 1
            
            # If in-degree becomes 0, add to queue
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    
    # Check if all nodes were processed
    if len(execution_order) == len(nodes):
        # No cycle - valid DAG
        return False, execution_order, None
    else:
        # Cycle detected - find remaining nodes
        remaining_nodes = [node_id for node_id in in_degree if node_id not in execution_order]
        error_msg = f"Cycle detected in workflow! Nodes involved: {', '.join(remaining_nodes[:5])}"
        if len(remaining_nodes) > 5:
            error_msg += f" and {len(remaining_nodes) - 5} more..."
        
        return True, None, error_msg


def validate_workflow_structure(workflow_def: Dict) -> Tuple[bool, Optional[str]]:
    """
    Validate workflow structure including cycle check, trigger presence, 
    end node presence, and connectivity.
    """
    nodes = workflow_def.get('nodes', [])
    edges = workflow_def.get('edges', [])
    
    if not nodes:
        return False, "Workflow must have at least one node"
    
    # 1. Check for Trigger Node
    has_trigger = any(n.get('type') in ['manual_trigger', 'webhook_trigger'] for n in nodes)
    if not has_trigger:
        return False, "Workflow must have at least one trigger node (Manual or Webhook)"
    
    # 2. Check for End Node
    has_end = any(n.get('type') == 'end' for n in nodes)
    if not has_end:
        return False, "Workflow must have at least one End node"
    
    # 3. Check for cycles and get topological order
    has_cycle, order, error_msg = check_cycle_and_get_order(nodes, edges)
    if has_cycle:
        return False, error_msg

    # 4. Check for Decision node connectivity (must have both branches)
    decision_nodes = [n for n in nodes if n.get('type') == 'decision_node']
    for dn in decision_nodes:
        dn_id = dn['id']
        true_branch = any(e for e in edges if e['source'] == dn_id and e.get('sourceHandle') == 'true')
        false_branch = any(e for e in edges if e['source'] == dn_id and e.get('sourceHandle') == 'false')
        if not true_branch or not false_branch:
            return False, f"Decision node '{dn_id}' must have both 'true' and 'false' branches connected."

    # 5. Check for disconnected nodes (Reachability from any trigger)
    trigger_nodes = [n['id'] for n in nodes if n.get('type') in ['manual_trigger', 'webhook_trigger']]
    adj_list = defaultdict(list)
    for edge in edges:
        adj_list[edge['source']].append(edge['target'])
    
    visited = set()
    queue = deque(trigger_nodes)
    while queue:
        curr = queue.popleft()
        if curr not in visited:
            visited.add(curr)
            for neighbor in adj_list[curr]:
                queue.append(neighbor)
    
    all_node_ids = {n['id'] for n in nodes}
    disconnected = all_node_ids - visited
    if disconnected:
        return False, f"Workflow has disconnected nodes: {', '.join(list(disconnected)[:3])}. All nodes must be reachable from a trigger."

    # 6. Path Completeness Analysis: Ensure all possible execution paths lead to an 'end' node
    # Use reverse BFS/DFS starting from end nodes to see which nodes can reach an end
    end_nodes = {n['id'] for n in nodes if n.get('type') == 'end'}
    rev_adj_list = defaultdict(list)
    for edge in edges:
        rev_adj_list[edge['target']].append(edge['source'])
    
    can_reach_end = set()
    e_queue = deque(list(end_nodes))
    while e_queue:
        curr = e_queue.popleft()
        if curr not in can_reach_end:
            can_reach_end.add(curr)
            for neighbor in rev_adj_list[curr]:
                e_queue.append(neighbor)
    
    # Only nodes that are reachable from a trigger MUST be able to reach an end node
    reachable_from_trigger = visited
    hanging_nodes = reachable_from_trigger - can_reach_end
    if hanging_nodes:
        return False, f"Workflow has nodes that don't lead to an 'End' node: {', '.join(list(hanging_nodes)[:3])}"

    # 7. Basic Configuration Validation
    for node in nodes:
        node_type = node.get('type')
        config = node.get('config', {})
        node_id = node.get('id')
        
        if node_type == 'http_request' and not config.get('url'):
             return False, f"HTTP Request node '{node_id}' is missing a URL."
        if node_type == 'transform_data' and not config.get('target_field'):
             return False, f"Transform Data node '{node_id}' is missing a target field."
        if node_type == 'decision_node' and not config.get('field'):
             return False, f"Decision node '{node_id}' is missing a field name to evaluate."

    return True, None


def get_workflow_execution_order(workflow_def: Dict) -> List[str]:
    """
    Get the execution order of nodes in the workflow
    
    Args:
        workflow_def: Workflow definition with 'nodes' and 'edges'
    
    Returns:
        List of node IDs in execution order
    
    Raises:
        ValueError: If workflow contains cycles
    """
    nodes = workflow_def.get('nodes', [])
    edges = workflow_def.get('edges', [])
    
    has_cycle, order, error_msg = check_cycle_and_get_order(nodes, edges)
    
    if has_cycle:
        raise ValueError(error_msg)
    
    return order
