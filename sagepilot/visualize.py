import requests
import json

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

response = requests.post(
    "http://localhost:8000/api/workflows/visualize",
    json=workflow_def
)

result = response.json()
print(result["ascii"])
print("\n" + "=" * 50)
print("Execution Order:", " → ".join(result["execution_order"]))