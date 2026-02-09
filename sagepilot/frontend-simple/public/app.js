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
  transform_data: { transformation_type: 'uppercase', target_field: 'message', parameters: { factor: 2 } },
  decision_node: { conditions: [{ field: 'value', operator: 'equals', value: 42, true_node: '', false_node: '' }] },
  end: {}
};

// Node type colors
const nodeColors = {
  manual_trigger: { background: '#86efac', border: '#22c55e' },
  transform_data: { background: '#fde047', border: '#eab308' },
  decision_node: { background: '#fdba74', border: '#f97316' },
  end: { background: '#fca5a5', border: '#ef4444' }
};

// Node type labels
const nodeLabels = {
  manual_trigger: '▶ Manual Trigger',
  transform_data: '🔄 Transform',
  decision_node: '🔀 Decision',
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
      addEdge: function (edgeData, callback) {
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
      deleteEdge: function (edgeData, callback) {
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
  network.on('click', function (params) {
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
  if (type === 'decision_node') {
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

  // Add event listener for add condition button if it exists

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



    case 'transform_data':
      html = `
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Transformation Type</label>
          <select id="config_transformation_type" class="w-full p-2 border border-gray-300 rounded">
            <option value="uppercase" ${config.transformation_type === 'uppercase' ? 'selected' : ''}>Uppercase</option>
            <option value="multiply" ${config.transformation_type === 'multiply' ? 'selected' : ''}>Multiply</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Factor (for Multiply)</label>
          <input type="number" id="config_factor" value="${(config.parameters || {}).factor || 2}" class="w-full p-2 border border-gray-300 rounded" placeholder="e.g., 2">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Target Field</label>
          <input type="text" id="config_target_field" value="${config.target_field}" class="w-full p-2 border border-gray-300 rounded" placeholder="e.g., message, value">
        </div>
      `;
      break;

    case 'decision_node':
      html = `
        <div class="border-t pt-4">
          <label class="block text-sm font-bold text-gray-700 mb-3">Conditions</label>
          <div id="conditionsList" class="space-y-4 mb-4">
            ${(config.conditions || []).map((cond, idx) => `
              <div class="p-3 bg-gray-50 rounded border border-gray-200">
                <div class="mb-2">
                  <label class="block text-sm font-medium text-gray-600">Field</label>
                  <input type="text" class="condition-field w-full p-2 border border-gray-300 rounded text-sm" data-idx="${idx}" value="${cond.field || ''}" placeholder="e.g., value, status">
                </div>
                <div class="mb-2">
                  <label class="block text-sm font-medium text-gray-600">Operator</label>
                  <select class="condition-operator w-full p-2 border border-gray-300 rounded text-sm" data-idx="${idx}">
                    <option value="equals" ${cond.operator === 'equals' ? 'selected' : ''}>equals</option>
                    <option value="greater_than" ${cond.operator === 'greater_than' ? 'selected' : ''}>greater_than</option>
                    <option value="less_than" ${cond.operator === 'less_than' ? 'selected' : ''}>less_than</option>
                  </select>
                </div>
                <div class="mb-2">
                  <label class="block text-sm font-medium text-gray-600">Value</label>
                  <input type="text" class="condition-value w-full p-2 border border-gray-300 rounded text-sm" data-idx="${idx}" value="${cond.value || ''}" placeholder="e.g., 42, active">
                </div>
                <div class="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label class="block text-sm font-medium text-gray-600">True Node</label>
                    <input type="text" class="condition-true-node w-full p-2 border border-gray-300 rounded text-sm" data-idx="${idx}" value="${cond.true_node || ''}" placeholder="e.g., transform_data_1">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-600">False Node</label>
                    <input type="text" class="condition-false-node w-full p-2 border border-gray-300 rounded text-sm" data-idx="${idx}" value="${cond.false_node || ''}" placeholder="e.g., end_1">
                  </div>
                </div>
              </div>
            `).join('')}

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

    case 'transform_data':
      config.transformation_type = document.getElementById('config_transformation_type').value;
      config.target_field = document.getElementById('config_target_field').value;
      config.parameters = { factor: Number(document.getElementById('config_factor').value) || 1 };
      break;

    case 'decision_node':
      config.conditions = [];
      document.querySelectorAll('.condition-field').forEach(elem => {
        const idx = elem.dataset.idx;
        let val = document.querySelector(`.condition-value[data-idx="${idx}"]`).value;
        // Parse number if possible
        if (!isNaN(val) && val.trim() !== '') {
          val = Number(val);
        }
        config.conditions.push({
          field: elem.value,
          operator: document.querySelector(`.condition-operator[data-idx="${idx}"]`).value,
          value: val,
          true_node: document.querySelector(`.condition-true-node[data-idx="${idx}"]`).value,
          false_node: document.querySelector(`.condition-false-node[data-idx="${idx}"]`).value
        });
      });
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