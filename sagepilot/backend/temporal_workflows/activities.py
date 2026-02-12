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
    
    import jinja2
    import httpx
    
    try:
        template_env = jinja2.Environment()
        try:
            url = template_env.from_string(url_template).render(**payload) if payload else url_template
            body_str = template_env.from_string(body_template).render(**payload) if payload else body_template
        except Exception as te:
            return {"error": f"Template rendering failed: {str(te)}", "status": "failed", "error_type": "TemplateError"}
        
        try:
            headers = json.loads(headers_raw)
        except:
            headers = {}

        async with httpx.AsyncClient() as client:
            try:
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
                    return {"error": f"Unsupported method: {method}", "status": "failed", "error_type": "ValidationError"}
                
                # Check for HTTP errors (4xx, 5xx)
                response.raise_for_status()

            except httpx.TimeoutException:
                return {"error": f"Request timed out after 10s: {url}", "status": "failed", "error_type": "Timeout"}
            except httpx.ConnectError:
                return {"error": f"Failed to connect to host: {url}", "status": "failed", "error_type": "ConnectionError"}
            except httpx.HTTPStatusError as hse:
                return {
                    "error": f"HTTP {hse.response.status_code}: {hse.response.text[:200]}", 
                    "status": "failed", 
                    "status_code": hse.response.status_code,
                    "error_type": "HTTPStatusError"
                }
            except Exception as e:
                return {"error": f"Network error: {str(e)}", "status": "failed", "error_type": "NetworkError"}
            
            # Payload truncation for large responses (approx 1MB limit for serialization safety)
            MAX_RESPONSE_SIZE = 1 * 1024 * 1024 # 1MB
            
            try:
                content_type = response.headers.get("content-type", "")
                if "application/json" in content_type:
                    resp_data = response.json()
                else:
                    resp_data = {"text": response.text[:MAX_RESPONSE_SIZE // 10], "status_code": response.status_code}
                
                # Check serialized size roughly
                if len(json.dumps(resp_data)) > MAX_RESPONSE_SIZE:
                    return {"error": "Response size exceeds 1MB limit for safety", "status_code": response.status_code, "error_type": "PayloadTooLarge"}
                    
                return resp_data
            except Exception as e:
                return {"text": response.text[:1000] if response.text else "", "status_code": response.status_code, "parse_error": str(e), "error_type": "ParseError"}
                
    except Exception as e:
        return {"error": str(e), "status": "failed", "error_type": "UnknownError"}

@activity.defn
async def execute_transform_data(config: dict, payload: dict) -> dict:
    """Transform data based on config with safety checks"""
    transformation_type = config.get("transformation_type")
    target_field = config.get("target_field")
    parameters = config.get("parameters", {})
    
    if isinstance(payload, (int, float, bool, str)):
        result = {"value": payload}
    else:
        result = payload.copy() if payload else {}
    
    if not target_field:
        return result

    try:
        if transformation_type == "multiply" and target_field in result:
            factor = parameters.get("factor", 1)
            val = result[target_field]
            try:
                num_val = float(val)
                result[target_field] = num_val * factor
            except (ValueError, TypeError):
                return {"error": f"Cannot multiply non-numeric field '{target_field}' (value: {val})", "status": "failed", "error_type": "TransformationError"}
        elif transformation_type == "uppercase" and target_field in result:
            result[target_field] = str(result[target_field]).upper()
        elif target_field not in result:
            return {"error": f"Target field '{target_field}' not found in payload", "status": "failed", "error_type": "MissingField"}
    except Exception as e:
        return {"error": f"Transformation failed: {str(e)}", "status": "failed", "error_type": "UnknownError"}
        
    return result
@activity.defn
async def evaluate_decision(config: dict, payload: dict) -> dict:
    """Evaluate decision condition and return boolean result"""
    field = config.get("field")
    operator = config.get("operator", "equals")
    value = config.get("value")
    
    if not field:
        return {"condition_met": False, "payload": payload, "error": "No field configured"}
        
    if field not in payload:
         return {"condition_met": False, "payload": payload, "error": f"Field {field} not in payload"}

    condition_met = False
    actual_value = payload[field]
    
    # Robust type coercion for comparison
    print(f"DEBUG Decision: Comparing {actual_value} ({type(actual_value).__name__}) {operator} {value} ({type(value).__name__})")
    
    try:
        # 1. Handle numeric coercion
        is_val_num = isinstance(value, (int, float))
        is_act_num = isinstance(actual_value, (int, float))
        
        if is_val_num and not is_act_num:
            actual_value = float(actual_value)
        elif is_act_num and not is_val_num:
            try:
                value = float(value)
            except: pass
            
        # 2. Handle boolean coercion
        if isinstance(actual_value, bool) and not isinstance(value, bool):
            if str(value).lower() == "true": value = True
            elif str(value).lower() == "false": value = False
    except:
        pass

    if operator == "equals":
        # Direct comparison
        condition_met = (actual_value == value)
        # Fallback string comparison for cases like "5" vs 5.0 or whitespace issues
        if not condition_met:
            condition_met = str(actual_value).strip().lower() == str(value).strip().lower()
            
    elif operator == "greater_than":
        condition_met = float(actual_value) > float(value)
    elif operator == "less_than":
        condition_met = float(actual_value) < float(value)
    
    print(f"DEBUG Decision: Result = {condition_met}")
    return {"condition_met": condition_met, "payload": payload}

@activity.defn
async def execute_end(config: dict, payload: dict) -> dict:
    """End node returns payload as-is"""
    return payload