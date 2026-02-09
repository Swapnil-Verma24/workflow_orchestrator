from temporalio import activity

@activity.defn
async def execute_manual_trigger(config: dict, payload: dict) -> dict:
    """Manual trigger returns initial payload"""
    return config.get("initial_payload", {})

@activity.defn
async def execute_transform_data(config: dict, payload: dict) -> dict:
    """Transform data based on config"""
    transformation_type = config.get("transformation_type")
    target_field = config.get("target_field")
    parameters = config.get("parameters", {})
    
    result = payload.copy() if payload else {}
    
    if transformation_type == "multiply" and target_field in result:
        factor = parameters.get("factor", 1)
        result[target_field] = result[target_field] * factor
    elif transformation_type == "uppercase" and target_field in result:
        result[target_field] = str(result[target_field]).upper()
    
    return result
@activity.defn
async def decision_node(config: dict, payload: dict) -> dict:
    """Decision node routes based on conditions - handles both true and false cases"""
    conditions = config.get("conditions", [])
    
    for condition in conditions:
        field = condition.get("field")
        operator = condition.get("operator")
        value = condition.get("value")
        true_node = condition.get("true_node")
        false_node = condition.get("false_node")
        
        # Field MUST exist in payload - if missing, it's a workflow/config error
        if field not in payload:
            raise ValueError(
                f"Decision node validation error: Required field '{field}' not found in payload. "
                f"Available fields: {list(payload.keys())}. "
            )
        
        # Evaluate condition
        condition_met = False
        if operator == "equals" and payload[field] == value:
            condition_met = True
        elif operator == "greater_than" and payload[field] > value:
            condition_met = True
        elif operator == "less_than" and payload[field] < value:
            condition_met = True
        
        # Return based on condition result
        # UI guarantees both true_node and false_node are defined
        if condition_met:
            return {"next_node": true_node, "payload": payload}
        else:
            return {"next_node": false_node, "payload": payload}
    

@activity.defn
async def execute_end(config: dict, payload: dict) -> dict:
    """End node returns payload as-is"""
    return payload