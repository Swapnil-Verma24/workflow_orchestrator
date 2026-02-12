import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow';

const useWorkflowStore = create((set, get) => ({
    nodes: [],
    edges: [],
    nodeConfigs: {},
    selectedNode: null,
    nodeCounts: {},
    currentWorkflowId: null,
    currentWebhookId: null,
    activeExecution: {
        runId: null,
        status: 'idle',
        results: null,
        trace: []
    },
    toasts: [],
    isLoading: false,

    setActiveExecution: (runId) => set({
        activeExecution: { runId, status: 'running', results: null, trace: [] }
    }),

    updateExecutionStatus: (status, trace, results) => set((state) => ({
        activeExecution: { ...state.activeExecution, status, trace, results }
    })),

    clearExecution: () => set({
        activeExecution: { runId: null, status: 'idle', results: null, trace: [] }
    }),

    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
        });
    },

    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },

    onConnect: (connection) => {
        const { sourceHandle } = connection;
        let label = '';
        let labelStyle = {};

        if (sourceHandle === 'true') {
            label = 'True';
            labelStyle = { fill: '#10b981', fontWeight: 700, fontSize: 10 };
        } else if (sourceHandle === 'false') {
            label = 'False';
            labelStyle = { fill: '#ef4444', fontWeight: 700, fontSize: 10 };
        }

        set({
            edges: addEdge({
                ...connection,
                animated: true,
                label,
                labelStyle,
                type: 'smoothstep'
            }, get().edges),
        });
    },

    deleteEdge: (edgeId) => {
        set((state) => ({
            edges: state.edges.filter((e) => e.id !== edgeId),
        }));
    },

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    addNode: (type, data = {}) => {
        const state = get();
        const counts = { ...state.nodeCounts };
        counts[type] = (counts[type] || 0) + 1;

        const typeLabels = {
            manual_trigger: "ManualTrigger",
            webhook_trigger: "Webhook",
            transform_data: "Transform",
            http_request: "HTTP",
            wait: "Wait",
            decision_node: "Decision",
            end: "End"
        };

        const logicalName = `${typeLabels[type] || type} ${counts[type]}`;
        const id = `${type}-${Date.now()}`;

        // Define boilerplate configurations for each node type
        const defaults = {
            manual_trigger: { initial_payload: { message: "hello world", status: "active" } },
            webhook_trigger: { webhook_url: "https://api.sagepilot.com/webhooks/trigger" },
            transform_data: { transformation_type: "uppercase", target_field: "message" },
            http_request: { url: "https://httpbin.org/get", method: "GET", headers: "{}" },
            wait: { duration: 5, unit: "seconds" },
            decision_node: { field: "status", operator: "equals", value: "active" },
            end: {}
        };

        const newNode = {
            id,
            type,
            position: { x: 100 + Math.random() * 100, y: 100 + Math.random() * 100 },
            data: { label: logicalName, ...data },
        };

        set({
            nodes: [...state.nodes, newNode],
            nodeCounts: counts,
            nodeConfigs: {
                ...state.nodeConfigs,
                [id]: { nodeType: type, ...(defaults[type] || {}), ...data },
            },
        });
    },

    updateNodeConfig: (id, config) => {
        set((state) => ({
            nodeConfigs: {
                ...state.nodeConfigs,
                [id]: { ...state.nodeConfigs[id], ...config },
            },
        }));
    },

    deleteNode: (id) => {
        set((state) => ({
            nodes: state.nodes.filter((n) => n.id !== id),
            edges: state.edges.filter((e) => e.source !== id && e.target !== id),
            nodeConfigs: Object.fromEntries(
                Object.entries(state.nodeConfigs).filter(([k]) => k !== id)
            ),
            selectedNode: state.selectedNode?.id === id ? null : state.selectedNode,
        }));
    },

    setSelectedNode: (node) => set({ selectedNode: node }),
    setCurrentWorkflowId: (id) => set({ currentWorkflowId: id }),
    setCurrentWebhookId: (id) => set({ currentWebhookId: id }),
    clearCanvas: () => set({ nodes: [], edges: [], nodeConfigs: {}, selectedNode: null, currentWorkflowId: null, currentWebhookId: null }),

    // Toast notifications
    addToast: (message, type = 'info', duration = 3000) => {
        const id = Date.now();
        set((state) => ({
            toasts: [...state.toasts, { id, message, type, duration }]
        }));
    },

    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter(t => t.id !== id)
        }));
    },

    setLoading: (isLoading) => set({ isLoading }),
}));

export default useWorkflowStore;
