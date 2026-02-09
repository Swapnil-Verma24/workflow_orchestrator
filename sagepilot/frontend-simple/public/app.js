// Workflow state
let nodes = new vis.DataSet([]);
let edges = new vis.DataSet([]);
let nodeConfigs = {}; // Store node configurations
let nodeCounter = 0;
let selectedNodeId = null;
let network = null;
let currentWorkflowId = null;

// Default configurations for each node type
const defaultConfigs = {
  manual_trigger: { initial_payload: { message: 'hello', value: 42 } },
  transform_data: { transformation_type: 'uppercase', target_field: 'message', parameters: { factor: 2 } },
  decision_node: { conditions: [{ field: 'value', operator: 'equals', value: 42, true_node: '', false_node: '' }] },
  webhook_trigger: {},
  http_request: { url: 'https://jsonplaceholder.typicode.com/posts/1', method: 'GET', headers: '{}', body: '' },
  wait: { duration: 5, unit: 'seconds' },
  end: {}
};

// Node type colors
const nodeColors = {
  manual_trigger: { background: '#86efac', border: '#22c55e' },
  transform_data: { background: '#fde047', border: '#eab308' },
  decision_node: { background: '#fdba74', border: '#f97316' },
  webhook_trigger: { background: '#d8b4fe', border: '#a855f7' },
  http_request: { background: '#93c5fd', border: '#3b82f6' },
  wait: { background: '#fef08a', border: '#eab308' },
  end: { background: '#fca5a5', border: '#ef4444' }
};

// Node type labels
const nodeLabels = {
  manual_trigger: '▶ Manual Trigger',
  transform_data: '🔄 Transform',
  decision_node: '🔀 Decision',
  webhook_trigger: '⚡ Webhook',
  http_request: '🌐 HTTP Request',
  wait: '⏳ Wait',
  end: '🏁 End'
};

// SessionStorage functions
function saveToSession() {
  const workflowState = {
    nodes: nodes.get(),
    edges: edges.get(),
    nodeConfigs: nodeConfigs,
    nodeCounter: nodeCounter,
    currentWorkflowId: currentWorkflowId,
    positions: {}
  };

  // Save node positions
  if (network) {
    nodes.get().forEach(node => {
      workflowState.positions[node.id] = network.getPosition(node.id);
    });
  }

  sessionStorage.setItem('workflow_state', JSON.stringify(workflowState));
  console.log('💾 Workflow saved to session');
}

function loadFromSession() {
  const savedState = sessionStorage.getItem('workflow_state');
  if (!savedState) {
    console.log('📭 No saved workflow in session');
    return;
  }

  try {
    const workflowState = JSON.parse(savedState);

    // Restore nodes and edges
    nodes.clear();
    edges.clear();
    nodes.add(workflowState.nodes);
    edges.add(workflowState.edges);

    // Restore configurations
    nodeConfigs = workflowState.nodeConfigs;
    nodeCounter = workflowState.nodeCounter || 0;
    currentWorkflowId = workflowState.currentWorkflowId || null;

    // Restore positions after a short delay to ensure network is ready
    if (workflowState.positions && network) {
      setTimeout(() => {
        Object.keys(workflowState.positions).forEach(nodeId => {
          const pos = workflowState.positions[nodeId];
          network.moveNode(nodeId, pos.x, pos.y);
        });
        network.fit();
      }, 100);
    }

    console.log('📂 Workflow loaded from session');
  } catch (error) {
    console.error('❌ Error loading from session:', error);
  }
}

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

  // Load from session on init
  loadFromSession();

  // Event listeners
  network.on('click', function (params) {
    if (params.nodes.length > 0) {
      selectedNodeId = params.nodes[0];
      showConfigPanel(selectedNodeId);
    } else {
      hideConfigPanel();
    }
  });

  // Save to session when edges are added or removed
  network.on('afterDrawing', function () {
    // Only save if there are actual changes (debounced)
    clearTimeout(window.sessionSaveTimeout);
    window.sessionSaveTimeout = setTimeout(saveToSession, 300);
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

  // Auto-save to session
  saveToSession();
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

    case 'webhook_trigger':
      html = `
        <div class="text-sm text-gray-600">
          <p class="mb-2">This node triggers the workflow via an external HTTP POST request.</p>
          <p class="mb-2"><strong>Payload:</strong> The JSON body of the request will be passed as the payload.</p>
          ${currentWorkflowId ? `
            <div class="mt-4 p-2 bg-gray-100 rounded border border-gray-200">
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Webhook URL</label>
              <div class="flex gap-1">
                <input readonly type="text" value="http://localhost:8000/api/webhooks/${currentWorkflowId}" class="w-full p-1 text-xs bg-white border rounded font-mono">
                <button type="button" onclick="navigator.clipboard.writeText('http://localhost:8000/api/webhooks/${currentWorkflowId}')" class="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs">📋</button>
              </div>
            </div>
          ` : '<p class="text-amber-600 text-xs mt-2">⚠ Click 🚀 Deploy to generate the Webhook URL.</p>'}
        </div>
      `;
      break;

    case 'http_request':
      html = `
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">URL (supports {{handlebars}})</label>
          <input type="text" id="config_url" value="${config.url}" class="w-full p-2 border border-gray-300 rounded font-mono text-sm">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Method</label>
          <select id="config_method" class="w-full p-2 border border-gray-300 rounded">
            <option value="GET" ${config.method === 'GET' ? 'selected' : ''}>GET</option>
            <option value="POST" ${config.method === 'POST' ? 'selected' : ''}>POST</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Headers (JSON)</label>
          <textarea id="config_headers" class="w-full h-20 p-2 border border-gray-300 rounded font-mono text-sm">${config.headers}</textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Body Template (for POST)</label>
          <textarea id="config_body" class="w-full h-32 p-2 border border-gray-300 rounded font-mono text-sm">${config.body}</textarea>
        </div>
      `;
      break;

    case 'wait':
      html = `
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Wait Duration</label>
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

    case 'http_request':
      config.url = document.getElementById('config_url').value;
      config.method = document.getElementById('config_method').value;
      config.headers = document.getElementById('config_headers').value;
      config.body = document.getElementById('config_body').value;
      break;

    case 'wait':
      config.duration = Number(document.getElementById('config_duration').value);
      config.unit = document.getElementById('config_unit').value;
      break;
  }

  alert('✅ Configuration saved!');
  saveToSession();
}

// Helper to get workflow definition
function getWorkflowDefinition() {
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

  return {
    id: currentWorkflowId, // Include ID if it exists for updates
    nodes: workflowNodes,
    edges: workflowEdges
  };
}

// Save/Deploy workflow
async function saveWorkflow() {
  const workflowDef = getWorkflowDefinition();
  if (workflowDef.nodes.length === 0) {
    alert('Cannot save empty workflow!');
    return;
  }

  // Always use POST to create a new deployment ID as per simplified backend
  const endpoint = 'http://localhost:8000/api/workflows';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflowDef)
    });

    if (!response.ok) throw new Error('Failed to deploy workflow');

    const result = await response.json();
    if (result.id) {
      currentWorkflowId = result.id;
      saveToSession();
      alert(`✅ Workflow deployed! ID: ${currentWorkflowId} `);
    }
  } catch (error) {
    alert('❌ Error deploying workflow: ' + error.message);
  }
}

// Delete node
function deleteNode() {
  if (!selectedNodeId) return;

  if (confirm('Delete this node?')) {
    nodes.remove(selectedNodeId);
    edges.remove(edges.get().filter(e => e.from === selectedNodeId || e.to === selectedNodeId));
    delete nodeConfigs[selectedNodeId];
    hideConfigPanel();
    saveToSession();
  }
}

// Run workflow
async function runWorkflow() {
  const workflowDef = getWorkflowDefinition();

  if (workflowDef.nodes.length === 0) {
    alert('Add some nodes first!');
    return;
  }

  console.log('Executing workflow:', workflowDef);

  try {
    const response = await fetch('http://localhost:8000/api/workflows/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflowDef)
    });

    const result = await response.json();
    console.log('Workflow started:', result);

    const runId = result.run_id;
    let executionResult = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max polling for now

    // Poll for completion
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const statusResponse = await fetch(`http://localhost:8000/api/executions/${runId}`);
      executionResult = await statusResponse.json();

      if (executionResult.status === 'completed' || executionResult.status === 'failed') {
        break;
      }
    }

    // Show result
    document.getElementById('resultContent').textContent = JSON.stringify(executionResult, null, 2);
    document.getElementById('resultModal').classList.remove('hidden');
  } catch (error) {
    alert('❌ Error executing workflow: ' + error.message);
    console.error(error);
  }
}




// ===== Database Persistence Functions =====

// Save workflow to database
async function saveWorkflowToDatabase() {
  const workflowName = prompt('Enter workflow name:');
  if (!workflowName || workflowName.trim() === '') return;

  const workflowData = {
    nodes: nodes.get(),
    edges: edges.get(),
    nodeConfigs: nodeConfigs,
    nodeCounter: nodeCounter,
    currentWorkflowId: currentWorkflowId,
    positions: {}
  };

  // Save node positions
  if (network) {
    nodes.get().forEach(node => {
      workflowData.positions[node.id] = network.getPosition(node.id);
    });
  }

  try {
    const response = await fetch('http://localhost:8000/api/workflows/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: workflowName,
        workflow_data: workflowData
      })
    });

    if (!response.ok) throw new Error('Failed to save workflow');

    const result = await response.json();
    alert(`✅ ${result.message}`);
  } catch (error) {
    alert('❌ Error saving workflow: ' + error.message);
  }
}

// Load workflow from database
async function loadWorkflowFromDatabase(workflowName) {
  try {
    const response = await fetch(`http://localhost:8000/api/workflows/saved/${encodeURIComponent(workflowName)}`);

    if (!response.ok) throw new Error('Failed to load workflow');

    const result = await response.json();
    const workflowData = result.workflow_data;

    // Clear current workflow
    nodes.clear();
    edges.clear();

    // Load workflow data
    nodes.add(workflowData.nodes);
    edges.add(workflowData.edges);
    nodeConfigs = workflowData.nodeConfigs;
    nodeCounter = workflowData.nodeCounter || 0;
    currentWorkflowId = workflowData.currentWorkflowId || null;

    // Restore positions
    if (workflowData.positions && network) {
      setTimeout(() => {
        Object.keys(workflowData.positions).forEach(nodeId => {
          const pos = workflowData.positions[nodeId];
          network.moveNode(nodeId, pos.x, pos.y);
        });
        network.fit();
      }, 100);
    }

    // Save to session as well
    saveToSession();

    // Close modal
    document.getElementById('loadModal').classList.add('hidden');

    alert(`✅ Workflow "${workflowName}" loaded successfully`);
  } catch (error) {
    alert('❌ Error loading workflow: ' + error.message);
  }
}

// List all saved workflows
async function listSavedWorkflows() {
  try {
    const response = await fetch('http://localhost:8000/api/workflows/saved');

    if (!response.ok) throw new Error('Failed to fetch workflows');

    const result = await response.json();
    const workflowList = document.getElementById('workflowList');

    if (result.workflows.length === 0) {
      workflowList.innerHTML = '<p class="text-gray-500 text-center py-4">No saved workflows found</p>';
      return;
    }

    workflowList.innerHTML = result.workflows.map(wf => `
      <div class="flex justify-between items-center p-3 border-b hover:bg-gray-50">
        <div class="flex-1">
          <div class="font-medium text-gray-800">${wf.name}</div>
          <div class="text-xs text-gray-500">
            Updated: ${new Date(wf.updated_at).toLocaleString()}
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="loadWorkflowFromDatabase('${wf.name}')" 
            class="px-3 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 text-sm">
            Load
          </button>
          <button onclick="deleteWorkflowFromDatabase('${wf.name}')" 
            class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
            Delete
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    alert('❌ Error listing workflows: ' + error.message);
  }
}

// Delete workflow from database
async function deleteWorkflowFromDatabase(workflowName) {
  if (!confirm(`Delete workflow "${workflowName}"?`)) return;

  try {
    const response = await fetch(`http://localhost:8000/api/workflows/saved/${encodeURIComponent(workflowName)}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete workflow');

    alert(`✅ Workflow "${workflowName}" deleted successfully`);

    // Refresh the list
    await listSavedWorkflows();
  } catch (error) {
    alert('❌ Error deleting workflow: ' + error.message);
  }
}

// Show save modal
function showSaveModal() {
  document.getElementById('saveAsModal').classList.remove('hidden');
  document.getElementById('workflowNameInput').value = '';
  document.getElementById('workflowNameInput').focus();
}

// Show load modal
async function showLoadModal() {
  document.getElementById('loadModal').classList.remove('hidden');
  await listSavedWorkflows();
}

// Validate workflow for cycles
async function validateWorkflow() {
  const workflowDef = getWorkflowDefinition();

  if (workflowDef.nodes.length === 0) {
    alert('⚠️ Add some nodes first!');
    return;
  }

  try {
    const response = await fetch('http://localhost:8000/api/workflows/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflowDef)
    });

    const result = await response.json();

    if (result.valid) {
      const order = result.execution_order.join(' → ');
      alert(`✅ Valid DAG!\n\nExecution Order:\n${order}`);
    } else {
      alert(`❌ Invalid Workflow!\n\n${result.error}\n\nPlease remove cycles to create a valid DAG.`);
    }
  } catch (error) {
    alert('❌ Error validating workflow: ' + error.message);
  }
}



// Clear workflow
function clearWorkflow() {
  if (confirm('Clear entire workflow?')) {
    nodes.clear();
    edges.clear();
    nodeConfigs = {};
    nodeCounter = 0;
    currentWorkflowId = null;
    hideConfigPanel();
    sessionStorage.removeItem('workflow_state');
    console.log('🗑️ Workflow cleared from session');
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
  document.getElementById('saveAsBtn').addEventListener('click', showSaveModal);
  document.getElementById('loadBtn').addEventListener('click', showLoadModal);
  document.getElementById('validateBtn').addEventListener('click', validateWorkflow);
  document.getElementById('runBtn').addEventListener('click', runWorkflow);
  document.getElementById('clearBtn').addEventListener('click', clearWorkflow);
  document.getElementById('closeConfigBtn').addEventListener('click', hideConfigPanel);
  document.getElementById('saveConfigBtn').addEventListener('click', saveConfig);
  document.getElementById('deleteNodeBtn').addEventListener('click', deleteNode);

  // Save As modal listeners
  document.getElementById('confirmSaveBtn').addEventListener('click', async () => {
    const workflowName = document.getElementById('workflowNameInput').value.trim();
    if (!workflowName) {
      alert('Please enter a workflow name');
      return;
    }

    document.getElementById('saveAsModal').classList.add('hidden');

    const workflowData = {
      nodes: nodes.get(),
      edges: edges.get(),
      nodeConfigs: nodeConfigs,
      nodeCounter: nodeCounter,
      currentWorkflowId: currentWorkflowId,
      positions: {}
    };

    // Save node positions
    if (network) {
      nodes.get().forEach(node => {
        workflowData.positions[node.id] = network.getPosition(node.id);
      });
    }

    try {
      const response = await fetch('http://localhost:8000/api/workflows/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workflowName,
          workflow_data: workflowData
        })
      });

      if (!response.ok) throw new Error('Failed to save workflow');

      const result = await response.json();
      alert(`✅ ${result.message}`);
    } catch (error) {
      alert('❌ Error saving workflow: ' + error.message);
    }
  });

  document.getElementById('cancelSaveBtn').addEventListener('click', () => {
    document.getElementById('saveAsModal').classList.add('hidden');
  });

  document.getElementById('closeLoadBtn').addEventListener('click', () => {
    document.getElementById('loadModal').classList.add('hidden');
  });

  document.getElementById('deployBtn')?.addEventListener('click', async () => {
    await saveWorkflow();
    // Re-render config if current node is webhook to show the URL
    if (selectedNodeId && nodeConfigs[selectedNodeId].nodeType === 'webhook_trigger') {
      showConfigPanel(selectedNodeId);
    }
  });
  document.getElementById('closeResultBtn').addEventListener('click', () => {
    document.getElementById('resultModal').classList.add('hidden');
  });
});