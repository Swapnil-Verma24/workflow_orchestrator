import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock, Play, Copy, Check } from 'lucide-react';
import useWorkflowStore from '../store/useWorkflowStore';

const ExecutionResults = () => {
    const { activeExecution, addToast } = useWorkflowStore();
    const { status, trace, results, runId } = activeExecution;
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [copiedFinal, setCopiedFinal] = useState(false);

    const copyToClipboard = (text, index = null) => {
        navigator.clipboard.writeText(text);
        if (index !== null) {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        } else {
            setCopiedFinal(true);
            setTimeout(() => setCopiedFinal(false), 2000);
        }
        addToast('Copied to clipboard!', 'success', 2000);
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    if (status === 'idle') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Play size={32} className="opacity-20" />
                </div>
                <h3 className="font-bold text-slate-600 mb-1">No Active Run</h3>
                <p className="text-xs">Click the <span className="font-bold text-emerald-500">Run</span> button to execute your workflow and see real-time results here.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header Status */}
            <div className="p-4 bg-white border-b border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Run ID</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded">#{runId?.slice(-8)}</span>
                        <button
                            onClick={() => copyToClipboard(runId)}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                            title="Copy full Run ID"
                        >
                            <Copy size={12} className="text-slate-400" />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {status === 'running' && (
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center animate-pulse">
                            <Clock size={16} className="text-blue-500" />
                        </div>
                    )}
                    {status === 'completed' && (
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                            <CheckCircle2 size={16} className="text-emerald-500" />
                        </div>
                    )}
                    {status === 'failed' && (
                        <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
                            <XCircle size={16} className="text-rose-500" />
                        </div>
                    )}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 capitalize">{status}</h3>
                        <p className="text-[10px] text-slate-400">{trace.length} step{trace.length !== 1 ? 's' : ''} executed</p>
                    </div>
                </div>
            </div>

            {/* Final Result */}
            {results && (
                <div className="p-4 bg-indigo-50 border-b border-indigo-100">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Final Workflow Result</div>
                        <button
                            onClick={() => copyToClipboard(JSON.stringify(results, null, 2))}
                            className="flex items-center gap-1 px-2 py-1 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                            title="Copy result"
                        >
                            {copiedFinal ? (
                                <>
                                    <Check size={12} className="text-emerald-500" />
                                    <span className="text-[10px] font-semibold text-emerald-600">Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={12} className="text-indigo-500" />
                                    <span className="text-[10px] font-semibold text-indigo-600">Copy</span>
                                </>
                            )}
                        </button>
                    </div>
                    <pre className="p-3 bg-white border border-indigo-100 text-[11px] text-slate-700 rounded-xl overflow-x-auto font-mono shadow-inner max-h-40">
                        {JSON.stringify(results, null, 2)}
                    </pre>
                </div>
            )}

            {/* Trace Steps */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {trace.map((step, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:border-indigo-100 transition-colors group">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded-full flex items-center justify-center">
                                    {step.step}
                                </span>
                                <h4 className="text-xs font-bold text-slate-600 truncate max-w-[140px]">
                                    {step.node_type?.replace('_', ' ') || 'Unknown'}
                                </h4>
                                {step.timestamp && (
                                    <span className="text-[9px] text-slate-400 font-mono">
                                        {formatTimestamp(step.timestamp)}
                                    </span>
                                )}
                            </div>
                            {step.status === 'failed' || step.error ? (
                                <XCircle size={14} className="text-rose-500" />
                            ) : (
                                <CheckCircle2 size={14} className="text-emerald-500" />
                            )}
                        </div>

                        {step.output && (
                            <div className="mt-2">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Output</div>
                                    <button
                                        onClick={() => copyToClipboard(JSON.stringify(step.output, null, 2), idx)}
                                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                                        title="Copy output"
                                    >
                                        {copiedIndex === idx ? (
                                            <Check size={12} className="text-emerald-500" />
                                        ) : (
                                            <Copy size={12} className="text-slate-400" />
                                        )}
                                    </button>
                                </div>
                                <pre className="p-2 bg-slate-900 text-[10px] text-emerald-400 rounded-lg overflow-x-auto font-mono max-h-32">
                                    {JSON.stringify(step.output, null, 2)}
                                </pre>
                            </div>
                        )}

                        {step.error && (
                            <div className="mt-2 p-2 bg-rose-50 border border-rose-100 rounded-lg">
                                <div className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter mb-1">Error</div>
                                <p className="text-[10px] text-rose-600 font-medium">{step.error}</p>
                            </div>
                        )}
                    </div>
                ))}

                {status === 'running' && (
                    <div className="flex items-center justify-center p-4 text-slate-400 gap-2">
                        <Clock size={14} className="animate-spin" />
                        <span className="text-[10px] font-medium italic">Executing next step...</span>
                    </div>
                )}
            </div>

        </div>
    );
};

export default ExecutionResults;
