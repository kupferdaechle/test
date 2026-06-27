import { useCallback, useRef, useState } from 'react';

export default function FileUpload({ onFile, loading }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file) => {
      if (!file || !file.name.endsWith('.knxproj')) return;
      const reader = new FileReader();
      reader.onload = (e) => onFile(e.target.result);
      reader.readAsArrayBuffer(file);
    },
    [onFile],
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile],
  );

  return (
    <div
      className={`drop-zone${dragOver ? ' drag-over' : ''}`}
      onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onClick={() => !loading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".knxproj"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
      {loading ? (
        <p>Lade Projekt…</p>
      ) : (
        <>
          <strong>KNX-Projekt öffnen</strong>
          <p>.knxproj-Datei hierher ziehen oder klicken</p>
        </>
      )}
    </div>
  );
}
