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
async def execute_end(config: dict, payload: dict) -> dict:
    """End node returns payload as-is"""
    return payload