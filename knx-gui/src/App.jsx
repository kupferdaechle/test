import { useCallback, useRef, useState } from 'react';
import { createKnxStore } from './store/knxStore.js';
import FileUpload from './components/FileUpload.jsx';
import DevicePanel from './components/DevicePanel.jsx';
import GaPanel from './components/GaPanel.jsx';

export default function App() {
  const storeRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [knxState, setKnxState] = useState(null);
  const [error, setError] = useState(null);
  const [selectedKo, setSelectedKo] = useState(null);

  const handleFile = useCallback(async (buffer) => {
    setStatus('loading');
    setError(null);
    try {
      const store = createKnxStore();
      storeRef.current = store;
      const state = await store.load(buffer);
      setKnxState(state);
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }, []);

  const apply = useCallback((newState) => {
    setKnxState(newState);
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const buf = await storeRef.current.export();
      const blob = new Blob([buf], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${knxState.projectId}_export.knxproj`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }, [knxState]);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="upload-screen">
        <h1>KNX Gruppenadress-Editor</h1>
        {error && <div className="error-msg">{error}</div>}
        <FileUpload onFile={handleFile} loading={status === 'loading'} />
      </div>
    );
  }

  return (
    <>
      <header className="app-header">
        <h1>KNX Gruppenadress-Editor — {knxState.projectId}</h1>
        <button className="btn-export" onClick={handleExport}>
          Export .knxproj
        </button>
      </header>
      <div className="editor">
        <DevicePanel
          devices={knxState.devices}
          links={knxState.links}
          selectedKo={selectedKo}
          onSelectKo={setSelectedKo}
          onRemoveLink={(refId, gaId) =>
            apply(storeRef.current.removeLink(refId, gaId))
          }
          onSetSending={(refId, gaId) =>
            apply(storeRef.current.setSending(refId, gaId))
          }
        />
        <GaPanel
          groupAddresses={knxState.groupAddresses}
          selectedKo={selectedKo}
          links={knxState.links}
          onCreateGa={(name, address) =>
            apply(storeRef.current.createGroupAddress(name, address))
          }
          onAddLink={(gaId) =>
            selectedKo &&
            apply(storeRef.current.addLink(selectedKo.comObjectRefId, selectedKo.deviceId, gaId))
          }
        />
      </div>
    </>
  );
}
