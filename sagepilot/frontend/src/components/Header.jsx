import React, { useState } from 'react';
import { Save, Play, Trash2, CheckCircle, Rocket, FolderOpen, Loader2, Download, Upload } from 'lucide-react';
import useWorkflowStore from '../store/useWorkflowStore';
import Tooltip from './Tooltip';
import axios from 'axios';

const Header = () => {
    const {
        nodes,
        edges,
        nodeConfigs,
        setNodes,
        setEdges,
        clearCanvas,
        updateNodeConfig,
        setActiveExecution,
        updateExecutionStatus,
        activeExecution,
        addToast,
        isLoading,
        setLoading
    } = useWorkflowStore();

    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const pollExecutionStatus = async (runId) => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/executions/${runId}`);
            const { status, execution_trace, result, error } = response.data;

            updateExecutionStatus(status, execution_trace || [], result || null);

            if (status === 'completed' || status === 'failed') {
                if (status === 'completed') {
                    addToast('Workflow completed successfully!', 'success', 4000);
                } else {
                    addToast(`Workflow failed: ${error || 'Unknown error'}`, 'error', 5000);
                }
                return;
            }

            // Poll again after 2 seconds
            setTimeout(() => pollExecutionStatus(runId), 2000);
        } catch (error) {
            console.error("Polling error:", error);
            updateExecutionStatus('error', [], null);
            addToast('Error polling workflow status', 'error');
        }
    };

    const handleClear = () => {
        setShowClearConfirm(true);
    };

    const confirmClear = () => {
        clearCanvas();
        setShowClearConfirm(false);
        addToast('Canvas cleared successfully', 'info');
    };

    const handleSave = async () => {
        let name = prompt("Enter a name for your workflow:");
        if (!name) return;
        name = name.trim();
        if (!name) return;

        setLoading(true);
        try {
            // Merge config into nodes for backend validation and storage
            const workflowData = {
                nodes: nodes.map(n => ({
                    ...n,
                    config: nodeConfigs[n.id] || {}
                })),
                edges,
            };
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/workflows/save`, {
                name,
                workflow_data: workflowData
            });

            // Sync current workflow identifier
            useWorkflowStore.getState().setCurrentWorkflowId(name);
            if (response.data.webhook_id) useWorkflowStore.getState().setCurrentWebhookId(response.data.webhook_id);

            addToast(`Workflow "${name}" saved successfully!`, 'success');
        } catch (error) {
            addToast(error.response?.data?.detail || 'Failed to save workflow', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (nodes.length === 0) {
            addToast('Cannot export an empty workflow', 'error');
            return;
        }

        try {
            const workflowData = {
                name: "Exported Workflow",
                workflow_data: {
                    nodes: nodes.map(n => ({
                        ...n,
                        config: nodeConfigs[n.id] || {}
                    })),
                    edges,
                }
            };

            const blob = new Blob([JSON.stringify(workflowData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `workflow-${new Date().getTime()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            addToast('Workflow exported successfully!', 'success');
        } catch (error) {
            addToast('Failed to export workflow', 'error');
        }
    };

    const handleImport = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target.result);
                setLoading(true);

                // Send to backend to save and get a reference
                const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/workflows/import`, json);

                // Update local state
                const workflow = json.workflow_data || json;
                if (workflow.nodes) {
                    setNodes(workflow.nodes);
                    workflow.nodes.forEach(node => {
                        if (node.config) updateNodeConfig(node.id, node.config);
                    });
                }
                if (workflow.edges) setEdges(workflow.edges);

                useWorkflowStore.getState().setCurrentWorkflowId(response.data.name);
                addToast('Workflow imported successfully!', 'success');
            } catch (error) {
                addToast('Failed to import workflow. Invalid format.', 'error');
            } finally {
                setLoading(false);
                // Clear the input
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleDeploy = async () => {
        if (nodes.length === 0) {
            addToast('Cannot deploy an empty workflow', 'error');
            return;
        }

        setLoading(true);
        try {
            const workflowDef = {
                nodes: nodes.map(n => ({
                    id: n.id,
                    type: n.type,
                    config: nodeConfigs[n.id] || {},
                    position: n.position
                })),
                edges: edges.map(e => ({
                    source: e.source,
                    target: e.target,
                    sourceHandle: e.sourceHandle,
                    targetHandle: e.targetHandle
                }))
            };

            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/workflows`, workflowDef);

            // Sync current workflow identifier (use name or ID)
            useWorkflowStore.getState().setCurrentWorkflowId(response.data.name || response.data.id);
            if (response.data.webhook_id) useWorkflowStore.getState().setCurrentWebhookId(response.data.webhook_id);

            addToast(`Workflow deployed! ID: ${response.data.id}`, 'success', 4000);
        } catch (error) {
            addToast(error.response?.data?.detail || 'Failed to deploy workflow', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRun = async () => {
        if (nodes.length === 0) {
            addToast('Cannot run an empty workflow', 'error');
            return;
        }

        setLoading(true);
        try {
            const workflowDef = {
                nodes: nodes.map(n => ({
                    id: n.id,
                    type: n.type,
                    config: nodeConfigs[n.id] || {},
                    position: n.position
                })),
                edges: edges.map(e => ({
                    source: e.source,
                    target: e.target,
                    sourceHandle: e.sourceHandle,
                    targetHandle: e.targetHandle
                }))
            };

            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/workflows/execute`, workflowDef);
            const runId = response.data.run_id;

            setActiveExecution(runId);
            pollExecutionStatus(runId);

            addToast(`Workflow started! Run ID: ${runId.slice(-8)}`, 'success', 3000);
        } catch (error) {
            addToast(error.response?.data?.detail || 'Failed to start workflow', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLoad = async () => {
        let name = prompt("Enter the name of the workflow to load:");
        if (!name) return;
        name = name.trim();
        if (!name) return;

        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/workflows/saved/${name}`);
            const data = response.data;
            if (data.workflow_data) {
                // Sync current workflow identifier
                useWorkflowStore.getState().setCurrentWorkflowId(data.name || name);
                if (data.webhook_id) useWorkflowStore.getState().setCurrentWebhookId(data.webhook_id);

                let workflow;
                try {
                    workflow = typeof data.workflow_data === 'string'
                        ? JSON.parse(data.workflow_data)
                        : data.workflow_data;
                } catch (e) {
                    console.error("Failed to parse workflow data:", e);
                    throw new Error("Invalid workflow data format");
                }

                if (workflow.nodes) {
                    setNodes(workflow.nodes);

                    // Restore configs from nodes or legacy nodeConfigs object
                    const newConfigs = {};

                    // 1. Try extracting from node.config
                    workflow.nodes.forEach(node => {
                        if (node.config) {
                            updateNodeConfig(node.id, node.config);
                        }
                    });

                    // 2. Try legacy nodeConfigs object
                    if (workflow.nodeConfigs) {
                        Object.entries(workflow.nodeConfigs).forEach(([id, config]) => {
                            updateNodeConfig(id, config);
                        });
                    }
                }

                if (workflow.edges) setEdges(workflow.edges);

                addToast(`Workflow "${name}" loaded successfully!`, 'success');
            }
        } catch (error) {
            console.error("Load error:", error);
            const errorMessage = error.response?.data?.detail || error.message || `Workflow "${name}" not found`;
            addToast(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <header className="h-20 glass-panel fixed top-0 w-full z-50 flex items-center justify-between px-8 border-b border-indigo-100/30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Rocket className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 leading-tight">SagePilot</h1>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Modern Orchestrator</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Tooltip content="Save your workflow for later" shortcut="Ctrl+S">
                        <button
                            onClick={handleSave}
                            disabled={isLoading || nodes.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Save
                        </button>
                    </Tooltip>

                    <Tooltip content="Load a saved workflow">
                        <button
                            onClick={handleLoad}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FolderOpen size={16} />
                            Load
                        </button>
                    </Tooltip>

                    <Tooltip content="Export workflow as JSON">
                        <button
                            onClick={handleExport}
                            disabled={isLoading || nodes.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download size={16} />
                            Export
                        </button>
                    </Tooltip>

                    <Tooltip content="Import workflow from JSON">
                        <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm cursor-pointer hover:bg-slate-50 disabled:opacity-50">
                            <Upload size={16} />
                            Import
                            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                        </label>
                    </Tooltip>

                    <div className="w-px h-6 bg-slate-200 mx-2" />

                    <Tooltip content="Clear the entire canvas" shortcut="Requires confirmation">
                        <button
                            onClick={handleClear}
                            disabled={isLoading || nodes.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-rose-200 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Trash2 size={16} />
                            Clear
                        </button>
                    </Tooltip>

                    <div className="w-px h-6 bg-slate-200 mx-2" />

                    <Tooltip content="Execute your workflow" shortcut="Ctrl+Enter">
                        <button
                            onClick={handleRun}
                            disabled={isLoading || nodes.length === 0 || activeExecution.status === 'running'}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-all shadow-md shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading || activeExecution.status === 'running' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                            Run
                        </button>
                    </Tooltip>

                    <Tooltip content="Deploy workflow for webhook access">
                        <button
                            onClick={handleDeploy}
                            disabled={isLoading || nodes.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Rocket size={16} />
                            Deploy
                        </button>
                    </Tooltip>
                </div>
            </header>

            {/* Clear Confirmation Dialog */}
            {showClearConfirm && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Clear Canvas?</h3>
                        <p className="text-sm text-slate-600 mb-6">
                            Are you sure you want to clear the entire canvas? This will remove all nodes and connections. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmClear}
                                className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition-all"
                            >
                                Clear Canvas
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Header;
