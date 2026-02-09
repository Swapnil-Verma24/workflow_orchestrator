"""
Comprehensive test suite for the workflow orchestrator
Tests decision_node, payload flow, and workflow routing
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from temporal_workflows.activities import (
    execute_manual_trigger,
    execute_transform_data,
    decision_node,
    execute_end
)

def print_section(title):
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

def print_result(test_name, passed, details=""):
    status = "✓ PASS" if passed else "✗ FAIL"
    print(f"{status}: {test_name}")
    if details:
        print(f"  {details}")

# ==============================================================================
# TEST 1: Decision Node - Basic Functionality
# ==============================================================================
async def test_decision_node_basic():
    print_section("TEST 1: Decision Node - Basic Functionality")
    
    tests_passed = 0
    tests_total = 0
    
    # Test 1.1: Condition TRUE
    tests_total += 1
    config = {
        "conditions": [{
            "field": "status",
            "operator": "equals",
            "value": "active",
            "true_node": "transform_data",
            "false_node": "end"
        }]
    }
    payload = {"status": "active", "user_id": 101}
    
    try:
        result = await decision_node(config, payload)
        if (result.get("next_node") == "transform_data" and 
            result.get("payload") == payload):
            print_result("Condition TRUE returns correct node and payload", True)
            tests_passed += 1
        else:
            print_result("Condition TRUE", False, 
                        f"Expected ('transform_data', payload), got ({result.get('next_node')}, {result.get('payload')})")
    except Exception as e:
        print_result("Condition TRUE", False, str(e))
    
    # Test 1.2: Condition FALSE
    tests_total += 1
    payload2 = {"status": "inactive", "user_id": 102}
    
    try:
        result = await decision_node(config, payload2)
        if (result.get("next_node") == "end" and 
            result.get("payload") == payload2):
            print_result("Condition FALSE returns correct node and payload", True)
            tests_passed += 1
        else:
            print_result("Condition FALSE", False, 
                        f"Expected ('end', payload), got ({result.get('next_node')}, {result.get('payload')})")
    except Exception as e:
        print_result("Condition FALSE", False, str(e))
    
    # Test 1.3: Greater than operator
    tests_total += 1
    config2 = {
        "conditions": [{
            "field": "amount",
            "operator": "greater_than",
            "value": 500,
            "true_node": "end",
            "false_node": "transform_data"
        }]
    }
    payload3 = {"amount": 750}
    
    try:
        result = await decision_node(config2, payload3)
        if result.get("next_node") == "end":
            print_result("Greater than operator (750 > 500)", True)
            tests_passed += 1
        else:
            print_result("Greater than operator", False, f"Got {result.get('next_node')}")
    except Exception as e:
        print_result("Greater than operator", False, str(e))
    
    # Test 1.4: Missing field raises error
    tests_total += 1
    config3 = {
        "conditions": [{
            "field": "missing_field",
            "operator": "equals",
            "value": "something",
            "true_node": "end",
            "false_node": "transform_data"
        }]
    }
    payload4 = {"other_field": "value"}
    
    try:
        result = await decision_node(config3, payload4)
        print_result("Missing field raises error", False, "Should have raised ValueError")
    except ValueError as e:
        if "not found in payload" in str(e):
            print_result("Missing field raises error", True)
            tests_passed += 1
        else:
            print_result("Missing field raises error", False, f"Wrong error: {e}")
    except Exception as e:
        print_result("Missing field raises error", False, f"Wrong exception type: {e}")
    
    print(f"\nDecision Node Tests: {tests_passed}/{tests_total} passed")
    return tests_passed, tests_total

# ==============================================================================
# TEST 2: Payload Flow Through Activities
# ==============================================================================
async def test_payload_flow():
    print_section("TEST 2: Payload Flow Through Activities")
    
    tests_passed = 0
    tests_total = 0
    
    # Test 2.1: Manual Trigger
    tests_total += 1
    config = {"initial_payload": {"user_id": 101, "status": "active"}}
    
    try:
        result = await execute_manual_trigger(config, None)
        if result == config["initial_payload"]:
            print_result("Manual trigger creates initial payload", True)
            tests_passed += 1
        else:
            print_result("Manual trigger", False, f"Got {result}")
    except Exception as e:
        print_result("Manual trigger", False, str(e))
    
    # Test 2.2: Transform Data preserves other fields
    tests_total += 1
    config = {
        "transformation_type": "multiply",
        "target_field": "amount",
        "parameters": {"factor": 2}
    }
    payload = {"user_id": 101, "amount": 500, "status": "active"}
    
    try:
        result = await execute_transform_data(config, payload)
        if (result.get("amount") == 1000 and 
            result.get("user_id") == 101 and 
            result.get("status") == "active"):
            print_result("Transform preserves all payload fields", True)
            tests_passed += 1
        else:
            print_result("Transform preserves fields", False, f"Got {result}")
    except Exception as e:
        print_result("Transform preserves fields", False, str(e))
    
    # Test 2.3: End node returns payload as-is
    tests_total += 1
    payload = {"user_id": 101, "amount": 1000, "status": "active"}
    
    try:
        result = await execute_end({}, payload)
        if result == payload:
            print_result("End node returns payload unchanged", True)
            tests_passed += 1
        else:
            print_result("End node", False, f"Got {result}")
    except Exception as e:
        print_result("End node", False, str(e))
    
    # Test 2.4: Decision node preserves payload
    tests_total += 1
    config = {
        "conditions": [{
            "field": "status",
            "operator": "equals",
            "value": "active",
            "true_node": "end",
            "false_node": "transform_data"
        }]
    }
    payload = {"user_id": 101, "amount": 500, "status": "active"}
    
    try:
        result = await decision_node(config, payload)
        if result.get("payload") == payload:
            print_result("Decision node preserves payload", True)
            tests_passed += 1
        else:
            print_result("Decision node preserves payload", False, f"Payload modified")
    except Exception as e:
        print_result("Decision node preserves payload", False, str(e))
    
    print(f"\nPayload Flow Tests: {tests_passed}/{tests_total} passed")
    return tests_passed, tests_total

# ==============================================================================
# TEST 3: Workflow Routing Simulation
# ==============================================================================
async def test_workflow_routing():
    print_section("TEST 3: Workflow Routing Simulation")
    
    tests_passed = 0
    tests_total = 0
    
    # Test 3.1: Simulate workflow path - TRUE condition
    tests_total += 1
    print("\nScenario 3.1: Manual Trigger → Transform Data → Decision (TRUE) → End")
    
    try:
        # Step 1: Manual Trigger
        trigger_config = {"initial_payload": {"user_id": 101, "amount": 500, "status": "active"}}
        payload = await execute_manual_trigger(trigger_config, None)
        
        # Step 2: Transform Data
        transform_config = {
            "transformation_type": "multiply",
            "target_field": "amount",
            "parameters": {"factor": 2}
        }
        payload = await execute_transform_data(transform_config, payload)
        
        # Step 3: Decision Node
        decision_config = {
            "conditions": [{
                "field": "amount",
                "operator": "greater_than",
                "value": 800,
                "true_node": "end",
                "false_node": "transform_data"
            }]
        }
        result = await decision_node(decision_config, payload)
        next_node = result.get("next_node")
        payload = result.get("payload")
        
        # Verify path
        if (next_node == "end" and 
            payload.get("amount") == 1000 and 
            payload.get("status") == "active"):
            print_result("Workflow TRUE path executed correctly", True,
                        f"amount={payload['amount']}, route=end")
            tests_passed += 1
        else:
            print_result("Workflow TRUE path", False, f"Got node={next_node}, amount={payload.get('amount')}")
    except Exception as e:
        print_result("Workflow TRUE path", False, str(e))
    
    # Test 3.2: Simulate workflow path - FALSE condition
    tests_total += 1
    print("\nScenario 3.2: Manual Trigger → Decision (FALSE) → Transform Data")
    
    try:
        # Step 1: Manual Trigger
        trigger_config = {"initial_payload": {"user_id": 102, "amount": 200, "status": "pending"}}
        payload = await execute_manual_trigger(trigger_config, None)
        
        # Step 2: Decision Node (check if amount > 500)
        decision_config = {
            "conditions": [{
                "field": "amount",
                "operator": "greater_than",
                "value": 500,
                "true_node": "end",
                "false_node": "transform_data"
            }]
        }
        result = await decision_node(decision_config, payload)
        next_node = result.get("next_node")
        payload = result.get("payload")
        
        # Step 3: Transform Data (since condition was false)
        if next_node == "transform_data":
            transform_config = {
                "transformation_type": "multiply",
                "target_field": "amount",
                "parameters": {"factor": 3}
            }
            payload = await execute_transform_data(transform_config, payload)
            
            if payload.get("amount") == 600:
                print_result("Workflow FALSE path executed correctly", True,
                            f"amount={payload['amount']} (200*3), route=transform_data")
                tests_passed += 1
            else:
                print_result("Workflow FALSE path", False, f"amount should be 600, got {payload.get('amount')}")
        else:
            print_result("Workflow FALSE path", False, f"Expected transform_data, got {next_node}")
    except Exception as e:
        print_result("Workflow FALSE path", False, str(e))
    
    # Test 3.3: Multiple conditions - first matches
    tests_total += 1
    print("\nScenario 3.3: Multiple conditions (first matches)")
    
    try:
        payload = {"status": "premium", "amount": 500}
        decision_config = {
            "conditions": [
                {
                    "field": "status",
                    "operator": "equals",
                    "value": "premium",
                    "true_node": "end",
                    "false_node": "transform_data"
                },
                {
                    "field": "status",
                    "operator": "equals",
                    "value": "standard",
                    "true_node": "transform_data",
                    "false_node": "end"
                }
            ]
        }
        result = await decision_node(decision_config, payload)
        
        # Should match first condition
        if result.get("next_node") == "end":
            print_result("First matching condition selected", True)
            tests_passed += 1
        else:
            print_result("First matching condition", False, f"Got {result.get('next_node')}")
    except Exception as e:
        print_result("First matching condition", False, str(e))
    
    print(f"\nWorkflow Routing Tests: {tests_passed}/{tests_total} passed")
    return tests_passed, tests_total

# ==============================================================================
# TEST 4: Edge Cases
# ==============================================================================
async def test_edge_cases():
    print_section("TEST 4: Edge Cases")
    
    tests_passed = 0
    tests_total = 0
    
    # Test 4.1: Less than operator
    tests_total += 1
    config = {
        "conditions": [{
            "field": "amount",
            "operator": "less_than",
            "value": 500,
            "true_node": "transform_data",
            "false_node": "end"
        }]
    }
    payload = {"amount": 300}
    
    try:
        result = await decision_node(config, payload)
        if result.get("next_node") == "transform_data":
            print_result("Less than operator (300 < 500)", True)
            tests_passed += 1
        else:
            print_result("Less than operator", False, f"Got {result.get('next_node')}")
    except Exception as e:
        print_result("Less than operator", False, str(e))
    
    # Test 4.2: Empty payload with field lookup
    tests_total += 1
    try:
        result = await execute_transform_data({"transformation_type": "multiply", "target_field": "amount", "parameters": {"factor": 2}}, {})
        if result == {}:
            print_result("Transform on empty payload returns empty", True)
            tests_passed += 1
        else:
            print_result("Transform on empty payload", False, f"Got {result}")
    except Exception as e:
        print_result("Transform on empty payload", False, str(e))
    
    # Test 4.3: Field value is 0 (falsy but valid)
    tests_total += 1
    config = {
        "conditions": [{
            "field": "amount",
            "operator": "greater_than",
            "value": 0,
            "true_node": "end",
            "false_node": "transform_data"
        }]
    }
    payload = {"amount": 0}
    
    try:
        result = await decision_node(config, payload)
        if result.get("next_node") == "transform_data":  # 0 is not > 0
            print_result("Handles falsy value (0) correctly", True)
            tests_passed += 1
        else:
            print_result("Handles falsy value", False, f"Got {result.get('next_node')}")
    except Exception as e:
        print_result("Handles falsy value", False, str(e))
    
    print(f"\nEdge Case Tests: {tests_passed}/{tests_total} passed")
    return tests_passed, tests_total

# ==============================================================================
# MAIN TEST RUNNER
# ==============================================================================
async def run_all_tests():
    print("\n")
    print("╔" + "="*78 + "╗")
    print("║" + " "*78 + "║")
    print("║" + "WORKFLOW ORCHESTRATOR - COMPREHENSIVE TEST SUITE".center(78) + "║")
    print("║" + " "*78 + "║")
    print("╚" + "="*78 + "╝")
    
    total_passed = 0
    total_tests = 0
    
    # Run all test suites
    p, t = await test_decision_node_basic()
    total_passed += p
    total_tests += t
    
    p, t = await test_payload_flow()
    total_passed += p
    total_tests += t
    
    p, t = await test_workflow_routing()
    total_passed += p
    total_tests += t
    
    p, t = await test_edge_cases()
    total_passed += p
    total_tests += t
    
    # Print summary
    print_section("FINAL RESULTS")
    print(f"\nTotal Tests: {total_tests}")
    print(f"Passed: {total_passed}")
    print(f"Failed: {total_tests - total_passed}")
    success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
    print(f"Success Rate: {success_rate:.1f}%")
    
    if total_passed == total_tests:
        print("\n✓ ALL TESTS PASSED!")
        print("\nWorkflow implementation is correct:")
        print("  • Decision node correctly evaluates conditions")
        print("  • Payload flows through all nodes unchanged")
        print("  • Routing follows decision results")
        print("  • Error handling works for missing fields")
    else:
        print(f"\n✗ {total_tests - total_passed} test(s) failed")
        print("Please review the failures above")
    
    print("\n" + "="*80)

if __name__ == "__main__":
    asyncio.run(run_all_tests())
