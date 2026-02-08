import requests
import json
import time

workflow_def = {
    "nodes": [
        {"id": "t1", "type": "manual_trigger", "config": {"initial_payload": {"msg": "test", "val": 10}}},
        {"id": "p1", "type": "transform_data", "config": {"transformation_type": "multiply", "target_field": "val", "parameters": {"factor": 2}}},
        {"id": "e1", "type": "end", "config": {}}
    ],
    "edges": [
        {"source": "t1", "target": "p1"},
        {"source": "p1", "target": "e1"}
    ]
}

print("🚀 Starting workflow execution...")
print("=" * 60)

# Execute workflow
response = requests.post(
    "http://localhost:8000/api/workflows/execute",
    json=workflow_def
)

print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}\n")

if response.status_code == 200:
    run_id = response.json()["run_id"]
    print(f"✅ Workflow started with run_id: {run_id}")
    print("=" * 60)
    
    # Wait a moment for execution
    print("\n⏳ Waiting for execution to complete...")
    time.sleep(2)
    
    # Check execution status
    print(f"\n📊 Checking execution status...")
    print("=" * 60)
    status_response = requests.get(f"http://localhost:8000/api/executions/{run_id}")
    
    result = status_response.json()
    print(f"\nExecution Status: {result.get('status')}")
    
    if result.get('status') == 'completed':
        print("\n✅ WORKFLOW COMPLETED SUCCESSFULLY!\n")
        print("📋 Execution Trace:")
        print("-" * 60)
        for step in result.get('result', {}).get('execution_trace', []):
            print(f"\nStep {step['step']}: {step['node_type']} (ID: {step['node_id']})")
            print(f"  Output: {json.dumps(step['output'], indent=2)}")
        
        print("\n" + "=" * 60)
        print("🎯 FINAL OUTPUT:")
        print(json.dumps(result.get('result', {}).get('final_output'), indent=2))
        print("=" * 60)
    else:
        print(f"\n⏳ Status: {result.get('status')}")
        print("Full response:", json.dumps(result, indent=2))
else:
    print(f"❌ Error: {response.status_code}")
    print(response.text)