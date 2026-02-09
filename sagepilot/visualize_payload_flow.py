"""
Visualization: How fields in payload flow through the workflow
Shows the importance of field presence at each decision node
"""

import json

def print_section(title):
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

def print_payload(label, payload):
    print(f"\n{label}:")
    print(json.dumps(payload, indent=2))

def print_decision(field, value, operator, payload_value, result):
    match_symbol = "✓" if result else "✗"
    print(f"  {match_symbol} Check: payload['{field}'] {operator} {value}")
    print(f"    Actual value: {payload_value}")
    print(f"    Result: {result}")

# ============================================================================
# SCENARIO 1: Complete Payload - All Fields Present
# ============================================================================
print_section("SCENARIO 1: Complete Payload (All Fields Present)")

print("\n📦 NODE 1: execute_manual_trigger")
print("UI Config:")
print(json.dumps({
    "initial_payload": {
        "user_id": 101,
        "status": "active",
        "amount": 750
    }
}, indent=2))

payload_1 = {"user_id": 101, "status": "active", "amount": 750}
print_payload("Output Payload", payload_1)

print("\n📦 NODE 2: execute_transform_data")
print("UI Config:")
print(json.dumps({
    "transformation_type": "multiply",
    "target_field": "amount",
    "parameters": {"factor": 2}
}, indent=2))

payload_2 = {"user_id": 101, "status": "active", "amount": 1500}
print_payload("Output Payload", payload_2)

print("\n📦 NODE 3: decision_node")
print("UI Config:")
print(json.dumps({
    "conditions": [
        {
            "field": "amount",
            "operator": "greater_than",
            "value": 1000,
            "true_node": "end",
            "false_node": "transform_data"
        }
    ]
}, indent=2))

print_payload("Input Payload to Decision", payload_2)
print("\nDecision Logic:")
print_decision("amount", 1000, ">", payload_2["amount"], payload_2["amount"] > 1000)
print("\n✓ ROUTE TO: end")
print("Reason: amount (1500) is > 1000 ✓")

# ============================================================================
# SCENARIO 2: Incomplete Payload - Missing Field
# ============================================================================
print_section("SCENARIO 2: Incomplete Payload (Missing 'status' Field)")

print("\n📦 NODE 1: execute_manual_trigger")
print("UI Config:")
print(json.dumps({
    "initial_payload": {
        "user_id": 101,
        "amount": 750
    }
}, indent=2))

payload_1b = {"user_id": 101, "amount": 750}
print_payload("Output Payload (Missing 'status')", payload_1b)

print("\n📦 NODE 2: execute_transform_data")
print("(Unchanged, just passes data through)")

payload_2b = {"user_id": 101, "amount": 750}
print_payload("Output Payload (Still Missing 'status')", payload_2b)

print("\n📦 NODE 3: decision_node")
print("UI Config:")
print(json.dumps({
    "conditions": [
        {
            "field": "status",          # ← Expecting this field
            "operator": "equals",
            "value": "active",
            "true_node": "end",
            "false_node": "transform_data"
        }
    ]
}, indent=2))

print_payload("Input Payload to Decision", payload_2b)
print("\nDecision Logic:")
print("⚠️  Check: 'status' field in payload?")
print(f"   Payload keys: {list(payload_2b.keys())}")
print("   'status' is MISSING ❌")
print("\n✗ ROUTE TO: transform_data (false_node)")
print("Reason: field 'status' doesn't exist → treated as FALSE")

# ============================================================================
# SCENARIO 3: Different Decision with Same Payload
# ============================================================================
print_section("SCENARIO 3: Same Payload, Different Decision Config")

payload_3 = {"user_id": 101, "amount": 750, "status": "pending"}
print_payload("Payload", payload_3)

print("\n✅ DECISION A: Check 'status' field")
print("UI Config:")
print(json.dumps({
    "conditions": [{
        "field": "status",
        "operator": "equals",
        "value": "active",
        "true_node": "end",
        "false_node": "transform_data"
    }]
}, indent=2))

print("\nDecision Logic:")
print_decision("status", "active", "==", payload_3["status"], payload_3["status"] == "active")
print("\n✗ ROUTE TO: transform_data (false_node)")
print("Reason: status is 'pending', not 'active'")

print("\n✅ DECISION B: Check 'amount' field (Same Payload)")
print("UI Config:")
print(json.dumps({
    "conditions": [{
        "field": "amount",
        "operator": "greater_than",
        "value": 500,
        "true_node": "end",
        "false_node": "transform_data"
    }]
}, indent=2))

print("\nDecision Logic:")
print_decision("amount", 500, ">", payload_3["amount"], payload_3["amount"] > 500)
print("\n✓ ROUTE TO: end")
print("Reason: amount is 750, which is > 500")

# ============================================================================
# KEY INSIGHTS
# ============================================================================
print_section("KEY INSIGHTS")

insights = """
1. FIELD MUST EXIST IN PAYLOAD
   ├─ Decision checks for specific field names in the payload
   ├─ If field missing → treated as FALSE condition
   └─ Example: Decision checks "status", but payload only has ["amount", "user_id"]

2. PAYLOAD EVOLVES THROUGH NODES
   ├─ Initial payload: {"status": "active", "amount": 750}
   ├─ After transform_data: {"status": "active", "amount": 1500}
   └─ Decision node receives the CURRENT payload state

3. FIELD VALUE MATTERS
   ├─ Field must exist (to avoid missing field)
   ├─ Field value is compared against condition value
   └─ Comparison result determines TRUE or FALSE routing

4. DIFFERENT DECISIONS, SAME PAYLOAD
   ├─ Same payload can route differently based on which field is checked
   ├─ Decision A checks "status" → FALSE → goes to transform_data
   ├─ Decision B checks "amount" → TRUE → goes to end
   └─ Different fields lead to different decisions

5. PRACTICAL IMPACT
   ├─ Ensure all nodes output required fields for downstream decisions
   ├─ Document which fields each node outputs
   ├─ Decision node config must match available fields in payload
   └─ Missing field = false_node routing (might not be intended)
"""

print(insights)

# ============================================================================
# RECOMMENDATION
# ============================================================================
print_section("RECOMMENDATION")

recommendation = """
✓ In UI, when configuring a condition:
  1. Know what fields the PREVIOUS node outputs
  2. Select field names that will be present in payload
  3. Document field availability at each node
  
✓ Node Configuration:
  Manual Trigger → outputs: ["user_id", "status", "amount"]
  Transform Data → outputs: ["user_id", "status", "amount"] (modified)
  Decision Node  → expects fields defined in conditions
  
✓ Testing:
  Test with different payloads to see field impact on routing
  Verify that required fields flow from previous nodes correctly
"""

print(recommendation)
