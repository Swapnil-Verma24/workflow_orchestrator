import React from 'react';
import { Play, Zap, RefreshCw, GitBranch, Terminal, Globe, Clock } from 'lucide-react';
import useWorkflowStore from '../store/useWorkflowStore';

const nodesList = [
    { type: 'manual_trigger', label: 'Manual Trigger', desc: 'Start workflow manually', icon: <Play />, color: 'emerald' },
    { type: 'webhook_trigger', label: 'Webhook Trigger', desc: 'Start via HTTP POST', icon: <Zap />, color: 'indigo' },
    { type: 'transform_data', label: 'Transform Data', desc: 'Modify payload', icon: <RefreshCw />, color: 'amber' },
    { type: 'decision_node', label: 'Decision', desc: 'Conditional branching', icon: <GitBranch />, color: 'rose' },
    { type: 'http_request', label: 'HTTP Request', desc: 'Outbound API calls', icon: <Globe />, color: 'blue' },
    { type: 'wait', label: 'Wait', desc: 'Pause execution', icon: <Clock />, color: 'orange' },
    { type: 'end', label: 'End', desc: 'Terminal node', icon: <Terminal />, color: 'slate' },
];

const Sidebar = () => {
    const addNode = useWorkflowStore((state) => state.addNode);

    const onDragStart = (event, nodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside className="w-80 glass-panel h-[calc(100vh-5rem)] mt-20 p-6 overflow-y-auto border-r border-indigo-100/30">
            <div className="mb-8">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Node Palette</h2>
                <p className="text-xs text-slate-400 mt-1">Click or drag a node to add it to the canvas</p>
            </div>

            <div className="grid gap-3">
                {nodesList.map((node) => (
                    <div
                        key={node.type}
                        className={`p-4 bg-white border border-slate-100 rounded-2xl cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group border-l-4 border-l-${node.color}-500`}
                        onClick={() => addNode(node.type)}
                        draggable
                        onDragStart={(e) => onDragStart(e, node.type)}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 bg-${node.color}-50 text-${node.color}-600 rounded-xl group-hover:scale-110 transition-transform`}>
                                {React.cloneElement(node.icon, { size: 18 })}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-700">{node.label}</h3>
                                <p className="text-[10px] font-medium text-slate-400">{node.desc}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
};

export default Sidebar;
