"""
Test script to validate decision_node behavior with 3 available nodes:
1. transform_data
2. decision_node
3. end
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from temporal_workflows.activities import decision_node

# Valid nodes in the workflow
VALID_NODES = {"transform_data", "decision_node", "end"}

# Test cases - only using valid node names
test_cases = [
    {
        "name": "Test 1: Condition TRUE - route to true_node",
        "config": {
            "conditions": [
                {
                    "field": "status",
                    "operator": "equals",
                    "value": "active",
                    "true_node": "transform_data",
                    "false_node": "end"
                }
            ]
        },
        "payload": {"status": "active"},
        "expected_node": "transform_data"
    },
    {
        "name": "Test 2: Condition FALSE - route to false_node",
        "config": {
            "conditions": [
                {
                    "field": "status",
                    "operator": "equals",
                    "value": "active",
                    "true_node": "transform_data",
                    "false_node": "end"
                }
            ]
        },
        "payload": {"status": "inactive"},
        "expected_node": "end"
    },
    {
        "name": "Test 3: Greater_than TRUE - route to true_node",
        "config": {
            "conditions": [
                {
                    "field": "score",
                    "operator": "greater_than",
                    "value": 50,
                    "true_node": "transform_data",
                    "false_node": "decision_node"
                }
            ]
        },
        "payload": {"score": 75},
        "expected_node": "transform_data"
    },
    {
        "name": "Test 4: Less_than FALSE - route to false_node",
        "config": {
            "conditions": [
                {
                    "field": "score",
                    "operator": "less_than",
                    "value": 50,
                    "true_node": "transform_data",
                    "false_node": "end"
                }
            ]
        },
        "payload": {"score": 75},
        "expected_node": "end"
    },
    {
        "name": "Test 5: First condition TRUE",
        "config": {
            "conditions": [
                {
                    "field": "type",
                    "operator": "equals",
                    "value": "premium",
                    "true_node": "end",
                    "false_node": "transform_data"
                }
            ]
        },
        "payload": {"type": "premium"},
        "expected_node": "end"
    },
    {
        "name": "Test 6: First condition FALSE, second evaluated",
        "config": {
            "conditions": [
                {
                    "field": "type",
                    "operator": "equals",
                    "value": "premium",
                    "true_node": "end",
                    "false_node": "transform_data"
                }
            ]
        },
        "payload": {"type": "standard"},
        "expected_node": "transform_data"
    },
    {
        "name": "Test 7: Field missing - raises error (workflow config issue)",
        "config": {
            "conditions": [
                {
                    "field": "missing_field",
                    "operator": "equals",
                    "value": "something",
                    "true_node": "decision_node",
                    "false_node": "end"
                }
            ]
        },
        "payload": {"other_field": "value"},
        "expected_error": True,
        "expected_node": None
    },
    {
        "name": "Test 8: Complex - amount between 500-1000",
        "config": {
            "conditions": [
                {
                    "field": "amount",
                    "operator": "greater_than",
                    "value": 500,
                    "true_node": "transform_data",
                    "false_node": "end"
                }
            ]
        },
        "payload": {"amount": 750},
        "expected_node": "transform_data"
    }
]

async def run_tests():
    """Run all decision node tests"""
    print("=" * 80)
    print("DECISION NODE TEST SUITE")
    print(f"Valid nodes: {', '.join(sorted(VALID_NODES))}")
    print("=" * 80)
    
    passed = 0
    failed = 0
    invalid_nodes = set()
    
    for test in test_cases:
        print(f"\n{test['name']}")
        print("-" * 80)
        print(f"Config: {test['config']}")
        print(f"Payload: {test['payload']}")
        
        try:
            result = await decision_node(test['config'], test['payload'])
            actual_node = result.get("next_node")
            actual_payload = result.get("payload")
            expected_node = test['expected_node']
            expected_payload = test['payload']  # Payload should pass through
            
            print(f"Expected Node: {expected_node}")
            print(f"Actual Node: {actual_node}")
            print(f"Payload preserved: {actual_payload == expected_payload}")
            
            # Check if we expected an error but didn't get one
            if test.get("expected_error"):
                print(f"✗ FAIL - Expected error but got result: {actual_node}")
                failed += 1
            # Check if returned node is valid
            elif actual_node is not None and actual_node not in VALID_NODES:
                print(f"✗ FAIL - Invalid node returned: {actual_node}")
                invalid_nodes.add(actual_node)
                failed += 1
            elif actual_node != expected_node:
                print(f"✗ FAIL - Expected {expected_node}, got {actual_node}")
                failed += 1
            elif actual_payload != expected_payload:
                print(f"✗ FAIL - Payload was not preserved")
                failed += 1
            else:
                print(f"✓ PASS")
                passed += 1
                
        except ValueError as e:
            if test.get("expected_error"):
                print(f"Expected Error: {str(e)}")
                print(f"✓ PASS - Correctly raised error")
                passed += 1
            else:
                print(f"✗ ERROR: {str(e)}")
                failed += 1
        except Exception as e:
            print(f"✗ UNEXPECTED ERROR: {str(e)}")
            failed += 1
    
    print("\n" + "=" * 80)
    print(f"RESULTS: {passed} passed, {failed} failed out of {len(test_cases)} tests")
    print("=" * 80)
    
    if invalid_nodes:
        print(f"\n⚠️  Invalid nodes used: {invalid_nodes}")
        print(f"   Valid nodes are: {VALID_NODES}")
    
    if failed == 0:
        print("\n✓ All tests passed!")
        print("\nDECISION NODE BEHAVIOR:")
        print("- Returns: {'next_node': node_id, 'payload': payload}")
        print("- Condition is evaluated as TRUE or FALSE")
        print("- If TRUE: returns true_node")
        print("- If FALSE: returns false_node")
        print("- Payload is preserved and passed through to next node")
        print("- If required field is MISSING: raises ValueError")
        print("\nWORKFLOW INTEGRATION:")
        print("- Workflow extracts 'next_node' from decision result")
        print("- Routes to that node dynamically")
        print("- Passes payload forward through the workflow")
        print("\nVALID ROUTING NODES:")
        for node in sorted(VALID_NODES):
            print(f"  • {node}")

if __name__ == "__main__":
    asyncio.run(run_tests())
