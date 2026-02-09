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
    Validate workflow structure including cycle check
    
    Args:
        workflow_def: Workflow definition with 'nodes' and 'edges'
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    nodes = workflow_def.get('nodes', [])
    edges = workflow_def.get('edges', [])
    
    # Check if workflow is empty
    if not nodes:
        return False, "Workflow must have at least one node"
    
    # Check for cycles
    has_cycle, order, error_msg = check_cycle_and_get_order(nodes, edges)
    
    if has_cycle:
        return False, error_msg
    
    # Additional validations can be added here
    # e.g., check for disconnected nodes, validate node types, etc.
    
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
