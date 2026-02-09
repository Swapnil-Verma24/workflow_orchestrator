import asyncio
from temporalio.client import Client
from temporalio.worker import Worker
from .workflows import WorkflowExecution
from .activities import execute_manual_trigger, execute_transform_data, execute_end, decision_node, execute_webhook_trigger, execute_http_request

async def main():
    client = await Client.connect("localhost:7233")
    
    worker = Worker(
        client,
        task_queue="workflow-execution-queue",
        workflows=[WorkflowExecution],
        activities=[execute_manual_trigger, execute_transform_data, execute_end, decision_node, execute_webhook_trigger, execute_http_request]
    )
    
    print("🚀 Temporal Worker started on task queue: workflow-execution-queue")
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())