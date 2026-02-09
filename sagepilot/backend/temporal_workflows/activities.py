from temporalio import activity
import json

@activity.defn
async def execute_manual_trigger(config: dict, payload: dict) -> dict:
    """Manual trigger returns initial payload"""
    return config.get("initial_payload", {})

@activity.defn
async def execute_webhook_trigger(config: dict, payload: dict) -> dict:
    """Webhook trigger returns the payload passed from the webhook"""
    return payload or {}

@activity.defn
async def execute_http_request(config: dict, payload: dict) -> dict:
    """Make an outbound HTTP request"""
    url_template = config.get("url", "")
    method = config.get("method", "GET").upper()
    headers_raw = config.get("headers", "{}")
    body_template = config.get("body", "")
    
    # Simple template rendering using Jinja2 if needed, or just basic f-string style
    # For now, let's just use payload directly in a simple way or allow {{key}} replacement
    import jinja2
    import httpx
    
    try:
        template_env = jinja2.Environment()
        url = template_env.from_string(url_template).render(**payload) if payload else url_template
        body_str = template_env.from_string(body_template).render(**payload) if payload else body_template
        
        try:
            headers = json.loads(headers_raw)
        except:
            headers = {}

        async with httpx.AsyncClient() as client:
            if method == "GET":
                response = await client.get(url, headers=headers, timeout=10.0)
            elif method == "POST":
                # Try to parse body as JSON if possible
                try:
                    data = json.loads(body_str)
                    response = await client.post(url, json=data, headers=headers, timeout=10.0)
                except:
                    response = await client.post(url, content=body_str, headers=headers, timeout=10.0)
            else:
                return {"error": f"Unsupported method: {method}"}
            
            try:
                return response.json()
            except:
                return {"text": response.text, "status_code": response.status_code}
                
    except Exception as e:
        return {"error": str(e), "status": "failed"}

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
    
    # Default if no conditions provided
    return {"next_node": None, "payload": payload, "error": "No conditions found in decision node"}

@activity.defn
async def execute_end(config: dict, payload: dict) -> dict:
    """End node returns payload as-is"""
    return payload