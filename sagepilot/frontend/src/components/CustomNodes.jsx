import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Play, Zap, RefreshCw, GitBranch, Terminal, Globe, Clock, Trash2 } from 'lucide-react';
import useWorkflowStore from '../store/useWorkflowStore';

const BaseNode = ({ id, data, type, selected, icon: Icon, color }) => {
    return (
        <div className={`px-2.5 py-2 shadow-lg rounded-xl bg-white border-2 transition-all min-w-[140px] ${selected ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-100 hover:border-indigo-200'
            }`}>
            <div className="flex items-center justify-between mb-1.5">
                <div className={`p-1.5 rounded-lg bg-${color}-50 text-${color}-600`}>
                    <Icon size={14} />
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        useWorkflowStore.getState().deleteNode(id);
                    }}
                    className="p-1 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                    title="Delete Node"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            <div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                    {type.replace('_', ' ')}
                </div>
                <div className="text-xs font-bold text-slate-700 truncate">
                    {data.label || id}
                </div>
            </div>

            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-indigo-500 border-2 border-white shadow-sm" />
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-indigo-500 border-2 border-white shadow-sm" />
        </div>
    );
};

const DecisionNode = ({ id, data, selected }) => {
    return (
        <div className={`px-2.5 py-2 shadow-lg rounded-xl bg-white border-2 transition-all min-w-[160px] ${selected ? 'border-rose-500 ring-4 ring-rose-50' : 'border-slate-100 hover:border-rose-200'
            }`}>
            <div className="flex items-center justify-between mb-1.5">
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                    <GitBranch size={14} />
                </div>
                <div className="flex items-center gap-1">
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mr-2">Decision</div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            useWorkflowStore.getState().deleteNode(id);
                        }}
                        className="p-1 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                        title="Delete Node"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className="text-xs font-bold text-slate-700 truncate mb-1">{data.label || id}</div>

            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-500 border-2 border-white shadow-sm" />

            <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-50">
                <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-emerald-500 uppercase">True</span>
                    <Handle type="source" position={Position.Bottom} id="true" className="w-3 h-3 bg-emerald-500 border-2 border-white shadow-sm !relative !top-0 !left-0 !transform-none mt-1" />
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-rose-500 uppercase">False</span>
                    <Handle type="source" position={Position.Bottom} id="false" className="w-3 h-3 bg-rose-500 border-2 border-white shadow-sm !relative !top-0 !left-0 !transform-none mt-1" />
                </div>
            </div>
        </div>
    );
};

const ManualTriggerNode = (props) => <BaseNode {...props} icon={Play} color="emerald" type="Manual Trigger" />;
const WebhookTriggerNode = (props) => <BaseNode {...props} icon={Zap} color="indigo" type="Webhook Trigger" />;
const TransformDataNode = (props) => <BaseNode {...props} icon={RefreshCw} color="amber" type="Transform" />;
const HttpRequestNode = (props) => <BaseNode {...props} icon={Globe} color="blue" type="HTTP Request" />;
const WaitNode = (props) => <BaseNode {...props} icon={Clock} color="orange" type="Wait" />;
const EndNode = (props) => <BaseNode {...props} icon={Terminal} color="slate" type="End" />;

export const nodeTypes = {
    manual_trigger: ManualTriggerNode,
    webhook_trigger: WebhookTriggerNode,
    transform_data: TransformDataNode,
    http_request: HttpRequestNode,
    wait: WaitNode,
    end: EndNode,
    decision_node: memo(DecisionNode),
};
