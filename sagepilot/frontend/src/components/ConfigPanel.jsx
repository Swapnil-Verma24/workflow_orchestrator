import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Settings, List, Activity, Copy, Check } from 'lucide-react';
import useWorkflowStore from '../store/useWorkflowStore';
import ExecutionResults from './ExecutionResults';

const ConfigPanel = () => {
    const {
        selectedNode,
        nodeConfigs,
        updateNodeConfig,
        deleteNode,
        setSelectedNode,
        activeExecution,
        addToast,
        currentWorkflowId
    } = useWorkflowStore();

    const [config, setConfig] = useState({});
    const [rawJson, setRawJson] = useState('');
    const [activeTab, setActiveTab] = useState('config'); // 'config' or 'execution'

    useEffect(() => {
        if (selectedNode) {
            const nodeConfig = nodeConfigs[selectedNode.id] || {};
            setConfig(nodeConfig);
            setRawJson(JSON.stringify(nodeConfig.initial_payload || {}, null, 2));
            setActiveTab('config');
        }
    }, [selectedNode, nodeConfigs]);

    // Switch to execution tab automatically when a run starts
    useEffect(() => {
        if (activeExecution.status === 'running') {
            setActiveTab('execution');
        }
    }, [activeExecution.status]);

    if (!selectedNode && activeExecution.status === 'idle') return null;

    const nodeType = selectedNode?.type;

    const handleSave = () => {
        if (selectedNode) {
            updateNodeConfig(selectedNode.id, config);
            addToast('✅ Configuration updated locally', 'success');
        }
    };

    const renderForm = () => {
        if (!selectedNode) return <div className="text-center p-8 text-slate-400 italic">Select a node to configure</div>;

        switch (nodeType) {
            case 'webhook_trigger':
                const identifier = currentWorkflowId || "{save_or_deploy_to_get_id}";
                const webhookUrl = `http://localhost:8000/api/webhooks/${identifier}`;
                return (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-2xl border ${currentWorkflowId ? 'bg-indigo-50 border-indigo-100' : 'bg-amber-50 border-amber-100'}`}>
                            <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ${currentWorkflowId ? 'text-indigo-400' : 'text-amber-500'}`}>
                                {currentWorkflowId ? 'Your Webhook URL' : 'URL NOT READY'}
                            </label>
                            <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <code className={`flex-1 text-[11px] font-mono truncate ${currentWorkflowId ? 'text-slate-600' : 'text-slate-400 italic'}`}>
                                    {webhookUrl}
                                </code>
                                {currentWorkflowId && (
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(webhookUrl);
                                            addToast('URL copied to clipboard!', 'success');
                                        }}
                                        className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-500 transition-colors"
                                        title="Copy URL"
                                    >
                                        <Copy size={16} />
                                    </button>
                                )}
                            </div>
                            {!currentWorkflowId && (
                                <p className="text-[10px] text-amber-600 mt-2 font-medium">
                                    ⚠️ Please save or deploy your workflow first to generate a permanent URL.
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-700">How to use:</h4>
                            <ul className="text-[11px] text-slate-500 space-y-2 list-disc pl-4">
                                <li>Deploy this workflow using the <span className="font-bold text-indigo-600">Deploy</span> button first.</li>
                                <li>Send a <span className="font-mono bg-slate-100 px-1 rounded text-rose-500">POST</span> request to the URL above.</li>
                                <li>Include your data as a <span className="font-bold italic">JSON body</span>. It will become the starting data for the workflow.</li>
                            </ul>
                        </div>
                    </div>
                );

            case 'manual_trigger':
                return (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Initial Payload (JSON)</label>
                            <span className="text-[10px] text-indigo-400 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">Pro Tip: Numbers/Objects work!</span>
                        </div>
                        <textarea
                            className="w-full h-40 p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl outline-none border border-slate-800 focus:border-indigo-500 shadow-inner"
                            value={rawJson}
                            onChange={(e) => {
                                setRawJson(e.target.value);
                                try {
                                    const val = JSON.parse(e.target.value);
                                    setConfig({ ...config, initial_payload: val });
                                } catch (err) { }
                            }}
                        />
                        <p className="text-[10px] text-slate-400 italic">Changes are saved to internal state as you type valid JSON.</p>
                    </div>
                );

            case 'transform_data':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Transformation Type</label>
                            <select
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 transition-all"
                                value={config.transformation_type || 'uppercase'}
                                onChange={(e) => setConfig({ ...config, transformation_type: e.target.value })}
                            >
                                <option value="uppercase">Uppercase</option>
                                <option value="multiply">Multiply</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Field</label>
                            <input
                                type="text"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 transition-all font-mono text-sm"
                                value={config.target_field || ''}
                                onChange={(e) => setConfig({ ...config, target_field: e.target.value })}
                                placeholder="e.g., message"
                            />
                        </div>
                        {config.transformation_type === 'multiply' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Factor</label>
                                <input
                                    type="number"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-400"
                                    value={config.parameters?.factor || 1}
                                    onChange={(e) => setConfig({ ...config, parameters: { factor: Number(e.target.value) } })}
                                />
                            </div>
                        )}
                    </div>
                );

            case 'decision_node':
                return (
                    <div className="space-y-4">
                        <p className="text-xs text-slate-400 italic mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">Note: Connect edges to the True/False ports on the node.</p>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Field to Check</label>
                            <input
                                type="text"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 font-mono text-sm"
                                value={config.field || ''}
                                onChange={(e) => setConfig({ ...config, field: e.target.value })}
                                placeholder="e.g., status"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Operator</label>
                            <select
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-400"
                                value={config.operator || 'equals'}
                                onChange={(e) => setConfig({ ...config, operator: e.target.value })}
                            >
                                <option value="equals">equals</option>
                                <option value="greater_than">greater than</option>
                                <option value="less_than">less than</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Comparison Value</label>
                            <input
                                type="text"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 font-mono text-sm"
                                value={typeof config.value === 'object' ? JSON.stringify(config.value) : (config.value ?? '')}
                                onChange={(e) => {
                                    let val = e.target.value;
                                    // Try to parse as number or boolean if it's not a clear string
                                    if (val === 'true') val = true;
                                    else if (val === 'false') val = false;
                                    else if (!isNaN(val) && val !== '') val = Number(val);

                                    setConfig({ ...config, value: val });
                                }}
                                placeholder="e.g., active or 25"
                            />
                            <p className="text-[10px] text-slate-400 mt-2">Values like <code className="bg-slate-100 px-1 rounded text-slate-600">25</code> or <code className="bg-slate-100 px-1 rounded text-slate-600">true</code> are automatically treated as their correct types.</p>
                        </div>
                    </div>
                );

            case 'http_request':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">URL</label>
                            <input
                                type="text"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 font-mono text-xs"
                                value={config.url || ''}
                                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                                placeholder="https://api.example.com"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Method</label>
                                <select
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-400"
                                    value={config.method || 'GET'}
                                    onChange={(e) => setConfig({ ...config, method: e.target.value })}
                                >
                                    <option value="GET">GET</option>
                                    <option value="POST">POST</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Headers (JSON)</label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 font-mono text-xs"
                                    value={config.headers || '{}'}
                                    onChange={(e) => setConfig({ ...config, headers: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Body Template</label>
                            <textarea
                                className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 font-mono text-xs"
                                value={config.body || ''}
                                onChange={(e) => setConfig({ ...config, body: e.target.value })}
                                placeholder='{"key": "{{field}}"}'
                            />
                        </div>
                    </div>
                );

            case 'wait':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Duration</label>
                            <input
                                type="number"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-400"
                                value={config.duration || 1}
                                onChange={(e) => setConfig({ ...config, duration: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Unit</label>
                            <select
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-400"
                                value={config.unit || 'seconds'}
                                onChange={(e) => setConfig({ ...config, unit: e.target.value })}
                            >
                                <option value="seconds">Seconds</option>
                                <option value="minutes">Minutes</option>
                            </select>
                        </div>
                    </div>
                );

            default:
                return <p className="text-slate-400 text-[11px] font-medium p-4 bg-slate-50 rounded-xl border border-slate-100">No configuration needed for this node.</p>;
        }
    };

    return (
        <div className={`fixed right-0 top-20 w-96 h-[calc(100vh-5rem)] glass-panel z-40 transition-transform duration-500 shadow-2xl border-l border-indigo-100/30 flex flex-col`}>
            {/* Extended Header with Tabs */}
            <div className="bg-white/80 border-b border-slate-100">
                <div className="p-6 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            {activeTab === 'config' ? <Settings size={18} /> : <Activity size={18} />}
                        </div>
                        <h2 className="font-bold text-slate-800 tracking-tight">
                            {activeTab === 'config' ? 'Node Config' : 'Execution Trace'}
                        </h2>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedNode(null);
                            if (activeExecution.status === 'idle') setSelectedNode(null);
                        }}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 pb-2 flex border-b border-slate-50">
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'config' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        <List size={14} /> Configuration
                    </button>
                    <button
                        onClick={() => setActiveTab('execution')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'execution' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        <Activity size={14} /> Run Results
                        {activeExecution.status === 'running' && (
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                        )}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'config' ? (
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {selectedNode ? (
                            <>
                                <div className="animate-in slide-in-from-right-4 duration-300">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Object</div>
                                    <div className="text-lg font-bold text-slate-700 truncate">{selectedNode.data?.label || selectedNode.id}</div>
                                </div>
                                {renderForm()}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                                <Settings size={40} className="mb-3 opacity-10" />
                                <p className="text-sm italic">Select a node on the canvas to configure its parameters.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <ExecutionResults />
                )}
            </div>

            {/* Footer - Only for Config Tab */}
            {activeTab === 'config' && selectedNode && (
                <div className="p-6 border-t border-slate-100 bg-white/50 flex gap-3">
                    <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                        <Save size={18} /> Save Changes
                    </button>
                    <button onClick={() => deleteNode(selectedNode.id)} className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all">
                        <Trash2 size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ConfigPanel;
