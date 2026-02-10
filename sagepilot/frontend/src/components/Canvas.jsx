import React, { useCallback, useRef } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Panel,
    ConnectionMode
} from 'reactflow';
import 'reactflow/dist/style.css';
import useWorkflowStore from '../store/useWorkflowStore';
import { nodeTypes } from './CustomNodes';

const Canvas = () => {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        setSelectedNode,
        addNode,
        deleteEdge
    } = useWorkflowStore();

    const reactFlowWrapper = useRef(null);

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');

            // check if the dropped element is valid
            if (typeof type === 'undefined' || !type) {
                return;
            }

            addNode(type);
        },
        [addNode]
    );

    return (
        <div className="flex-1 h-[calc(100vh-5rem)] mt-20 relative" ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgesDelete={(deletedEdges) => {
                    deletedEdges.forEach(edge => deleteEdge(edge.id));
                }}
                onInit={(instance) => instance.fitView()}
                onNodeClick={(_, node) => setSelectedNode(node)}
                onPaneClick={() => setSelectedNode(null)}
                onDrop={onDrop}
                onDragOver={onDragOver}
                connectionMode={ConnectionMode.Loose}
                deleteKeyCode={['Backspace', 'Delete']}
                fitView
            >
                <Background gap={20} color="#e5e7eb" />
                <Controls />
                <Panel position="bottom-right" className="glass-panel p-2 rounded-lg text-[10px] font-bold text-slate-400">
                    React Flow + SagePilot Engine
                </Panel>
            </ReactFlow>
        </div>
    );
};

export default Canvas;
