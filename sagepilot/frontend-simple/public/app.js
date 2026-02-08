// Workflow state
let nodes = new vis.DataSet([]);
let edges = new vis.DataSet([]);
let nodeConfigs = {}; // Store node configurations
let nodeCounter = 0;
let selectedNodeId = null;
let network = null;

// Default configurations for each node type
const defaultConfigs = {
  manual_trigger: { initial_payload: { message: 'hello', value: 42 } },
  webhook_trigger: { webhook_url: '/api/webhooks/...' },
  http_request: { url: 'https://api.example.com', method: 'GET', headers: {}, body_template: '' },
  transform_data: { transformation_type: 'uppercase', target_field: 'message', parameters: {} },
  decision: { target_field: 'status', operator: 'equals', comparison_value: 'active' },
  wait: { duration: 30, unit: 'seconds' },
  end: {}
};

// Node type colors
const nodeColors = {
  manual_trigger: { background: '#86efac', border: '#22c55e' },
  webhook_trigger: { background: '#93c5fd', border: '#3b82f6' },
  http_request: { background: '#c4b5fd', border: '#8b5cf6' },
  transform_data: { background: '#fde047', border: '#eab308' },
  decision: { background: '#fdba74', border: '#f97316' },
  wait: { background: '#a5b4fc', border: '#6366f1' },
  end: { background: '#fca5a5', border: '#ef4444' }
};

// Node type labels
const nodeLabels = {
  manual_trigger: '▶ Manual Trigger',
  webhook_trigger: '🔗 Webhook',
  http_request: '🌐 HTTP Request',
  transform_data: '🔄 Transform',
  decision: '🔀 Decision',
  wait: '⏱ Wait',
  end: '🏁 End'
};

// Initialize network
// Initialize network
function initNetwork() {
  const container = document.getElementById('network');
  const data = { nodes, edges };
  
  const options = {
    physics: {
      enabled: false
    },
    interaction: {
      dragNodes: true,
      dragView: true,
      zoomView: true
    },
    manipulation: {
      enabled: true,  // ← Changed to true
      addNode: false,  // Disable default node creation
      addEdge: function(edgeData, callback) {
        // Allow edge creation
        if (edgeData.from !== edgeData.to) {
          edgeData.arrows = 'to';
          callback(edgeData);
        } else {
          callback(null); // Cancel self-loops
        }
      },
      editEdge: false,
      deleteNode: false,
      deleteEdge: function(edgeData, callback) {
        if (confirm('Delete this connection?')) {
          callback(edgeData);
        } else {
          callback(null);
        }
      }
    },
    edges: {
      arrows: {
        to: { enabled: true, scaleFactor: 1 }
      },
      smooth: {
        type: 'cubicBezier'
      },
      color: {
        color: '#848484',
        highlight: '#3b82f6',
        hover: '#3b82f6'
      },
      width: 2
    }
  };

  network = new vis.Network(container, data, options);

  // Event listeners
  network.on('click', function(params) {
    if (params.nodes.length > 0) {
      selectedNodeId = params.nodes[0];
      showConfigPanel(selectedNodeId);
    } else {
      hideConfigPanel();
    }
  });

  // Remove the doubleClick listener - we don't need it anymore
}

// Add node to canvas
function addNode(type) {
  nodeCounter++;
  const nodeId = `${type}_${nodeCounter}`;
  
  const newNode = {
    id: nodeId,
    label: nodeLabels[type],
    color: nodeColors[type],
    shape: 'box',
    margin: 10,
    font: { size: 14, face: 'arial' }
  };

  // Add decision node with special handles
  if (type === 'decision') {
    newNode.shape = 'diamond';
  }

  nodes.add(newNode);
  nodeConfigs[nodeId] = { ...defaultConfigs[type], nodeType: type };
  
  // Position new node in center
  const position = network.getViewPosition();
  network.moveNode(nodeId, position.x, position.y);
}

// Show configuration panel
function showConfigPanel(nodeId) {
  selectedNodeId = nodeId;
  const config = nodeConfigs[nodeId];
  const nodeType = config.nodeType;

  document.getElementById('configPanel').classList.remove('hidden');
  document.getElementById('nodeTypeLabel').textContent = nodeLabels[nodeType];
  document.getElementById('nodeIdLabel').textContent = nodeId;

  // Build form based on node type
  const form = document.getElementById('configForm');
  form.innerHTML = buildConfigForm(nodeType, config);
}

// Hide configuration panel
function hideConfigPanel() {
  document.getElementById('configPanel').classList.add('hidden');
  selectedNodeId = null;
}

// Build configuration form dynamically
function buildConfigForm(nodeType, config) {
  let html = '';

  switch (nodeType) {
    case 'manual_trigger':
      html = `
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Initial Payload (JSON)</label>
          <textarea id="config_initial_payload" class="w-full h-32 p-2 border border-gray-300 rounded font-mono text-sm">${JSON.stringify(config.initial_payload, null, 2)}</textarea>
        </div>
      `;
      break;

    case 'http_request':
      html = `
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">URL</label>
          <input type="text" id="config_url" value="${config.url}" class="w-full p-2 border border-gray-300 rounded" placeholder="https://api.example.com/data">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Method</label>
          <select id="config_method" class="w-full p-2 border border-gray-300 rounded">
            <option value="GET" ${config.method === 'GET' ? 'selected' : ''}>GET</option>
            <option value="POST" ${config.method === 'POST' ? 'selected' : ''}>POST</option>
          </select>
        </div>
      `;
      break;

    case 'transform_data':
      html = `
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Transformation Type</label>
          <select id="config_transformation_type" class="w-full p-2 border border-gray-300 rounded">
            <option value="uppercase" ${config.transformation_type === 'uppercase' ? 'selected' : ''}>Uppercase</option>
            <option value="multiply" ${config.transformation_type === 'multiply' ? 'selected' : ''}>Multiply</option>
            <option value="append" ${config.transformation_type === 'append' ? 'selected' : ''}>Append</option>
            <option value="extract" ${config.transformation_type === 'extract' ? 'selected' : ''}>Extract</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Target Field</label>
          <input type="text" id="config_target_field" value="${config.target_field}" class="w-full p-2 border border-gray-300 rounded">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Factor (for multiply)</label>
          <input type="number" id="config_factor" value="${config.parameters?.factor || 1}" class="w-full p-2 border border-gray-300 rounded">
        </div>
      `;
      break;

    case 'decision':
      html = `
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Target Field</label>
          <input type="text" id="config_target_field" value="${config.target_field}" class="w-full p-2 border border-gray-300 rounded">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Operator</label>
          <select id="config_operator" class="w-full p-2 border border-gray-300 rounded">
            <option value="equals" ${config.operator === 'equals' ? 'selected' : ''}>Equals</option>
            <option value="not_equals" ${config.operator === 'not_equals' ? 'selected' : ''}>Not Equals</option>
            <option value="greater_than" ${config.operator === 'greater_than' ? 'selected' : ''}>Greater Than</option>
            <option value="less_than" ${config.operator === 'less_than' ? 'selected' : ''}>Less Than</option>
            <option value="contains" ${config.operator === 'contains' ? 'selected' : ''}>Contains</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Comparison Value</label>
          <input type="text" id="config_comparison_value" value="${config.comparison_value}" class="w-full p-2 border border-gray-300 rounded">
        </div>
      `;
      break;

    case 'wait':
      html = `
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Duration</label>
          <input type="number" id="config_duration" value="${config.duration}" class="w-full p-2 border border-gray-300 rounded">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Unit</label>
          <select id="config_unit" class="w-full p-2 border border-gray-300 rounded">
            <option value="seconds" ${config.unit === 'seconds' ? 'selected' : ''}>Seconds</option>
            <option value="minutes" ${config.unit === 'minutes' ? 'selected' : ''}>Minutes</option>
          </select>
        </div>
      `;
      break;

    default:
      html = '<div class="text-gray-500 text-sm">No configuration needed for this node type.</div>';
  }

  return html;
}

// Save configuration
function saveConfig() {
  if (!selectedNodeId) return;

  const config = nodeConfigs[selectedNodeId];
  const nodeType = config.nodeType;

  // Read form values based on node type
  switch (nodeType) {
    case 'manual_trigger':
      try {
        config.initial_payload = JSON.parse(document.getElementById('config_initial_payload').value);
      } catch (e) {
        alert('Invalid JSON in initial payload!');
        return;
      }
      break;

    case 'http_request':
      config.url = document.getElementById('config_url').value;
      config.method = document.getElementById('config_method').value;
      break;

    case 'transform_data':
      config.transformation_type = document.getElementById('config_transformation_type').value;
      config.target_field = document.getElementById('config_target_field').value;
      config.parameters = { factor: parseFloat(document.getElementById('config_factor').value) };
      break;

    case 'decision':
      config.target_field = document.getElementById('config_target_field').value;
      config.operator = document.getElementById('config_operator').value;
      config.comparison_value = document.getElementById('config_comparison_value').value;
      break;

    case 'wait':
      config.duration = parseInt(document.getElementById('config_duration').value);
      config.unit = document.getElementById('config_unit').value;
      break;
  }

  alert('✅ Configuration saved!');
}

// Delete node
function deleteNode() {
  if (!selectedNodeId) return;

  if (confirm('Delete this node?')) {
    nodes.remove(selectedNodeId);
    edges.remove(edges.get().filter(e => e.from === selectedNodeId || e.to === selectedNodeId));
    delete nodeConfigs[selectedNodeId];
    hideConfigPanel();
  }
}

// Run workflow
async function runWorkflow() {
  const workflowNodes = nodes.get().map(n => ({
    id: n.id,
    type: nodeConfigs[n.id].nodeType,
    config: { ...nodeConfigs[n.id] },
    position: network.getPosition(n.id)
  }));

  const workflowEdges = edges.get().map(e => ({
    source: e.from,
    target: e.to
  }));

  if (workflowNodes.length === 0) {
    alert('Add some nodes first!');
    return;
  }

  const workflowDef = {
    nodes: workflowNodes,
    edges: workflowEdges
  };

  console.log('Executing workflow:', workflowDef);

  try {
    const response = await fetch('http://localhost:8000/api/workflows/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflowDef)
    });

    const result = await response.json();
    console.log('Workflow started:', result);

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 2000));

    const statusResponse = await fetch(`http://localhost:8000/api/executions/${result.run_id}`);
    const executionResult = await statusResponse.json();

    // Show result
    document.getElementById('resultContent').textContent = JSON.stringify(executionResult, null, 2);
    document.getElementById('resultModal').classList.remove('hidden');
  } catch (error) {
    alert('❌ Error executing workflow: ' + error.message);
    console.error(error);
  }
}






// Clear workflow
function clearWorkflow() {
  if (confirm('Clear entire workflow?')) {
    nodes.clear();
    edges.clear();
    nodeConfigs = {};
    nodeCounter = 0;
    hideConfigPanel();
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  initNetwork();

  // Add node buttons
  document.querySelectorAll('.add-node-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addNode(btn.dataset.type);
    });
  });

  // Control buttons
  document.getElementById('runBtn').addEventListener('click', runWorkflow);
  document.getElementById('clearBtn').addEventListener('click', clearWorkflow);
  document.getElementById('closeConfigBtn').addEventListener('click', hideConfigPanel);
  document.getElementById('saveConfigBtn').addEventListener('click', saveConfig);
  document.getElementById('deleteNodeBtn').addEventListener('click', deleteNode);
  document.getElementById('closeResultBtn').addEventListener('click', () => {
    document.getElementById('resultModal').classList.add('hidden');
  });
});