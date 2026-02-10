import React from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import ConfigPanel from './components/ConfigPanel';
import ToastContainer from './components/Toast';
import useWorkflowStore from './store/useWorkflowStore';
import { ReactFlowProvider } from 'reactflow';

function App() {
  const { toasts, removeToast } = useWorkflowStore();

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 relative overflow-hidden">
            <Canvas />
          </main>
          <ConfigPanel />
        </div>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    </ReactFlowProvider>
  );
}

export default App;
