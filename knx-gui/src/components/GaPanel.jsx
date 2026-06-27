import { useMemo, useState } from 'react';
import { toGroupAddressString } from '../utils/addressUtils.js';

export default function GaPanel({ groupAddresses, selectedKo, links, onCreateGa, onAddLink }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState('');

  // Set of GA ids linked to the currently selected KO
  const linkedToSelected = useMemo(() => {
    if (!selectedKo) return new Set();
    const link = links.find((l) => l.comObjectRefId === selectedKo.comObjectRefId);
    return new Set(link?.groupAddressIds ?? []);
  }, [selectedKo, links]);

  // Set of ALL linked GA ids (for visual indicator)
  const allLinkedIds = useMemo(() => {
    const s = new Set();
    for (const l of links) for (const id of l.groupAddressIds) s.add(id);
    return s;
  }, [links]);

  const handleCreate = () => {
    setFormError('');
    const num = Number(address);
    if (!name.trim()) return setFormError('Name erforderlich');
    if (!Number.isInteger(num) || num < 0 || num > 65535)
      return setFormError('Adresse 0–65535');
    try {
      onCreateGa(name.trim(), num);
      setName('');
      setAddress('');
    } catch (e) {
      setFormError(e.message);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <span>Gruppenadresse{selectedKo ? ' — KO ausgewählt' : ''}</span>
        <span className="badge">{groupAddresses.length}</span>
      </div>

      <div className="create-ga-form">
        <input
          className="name"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <input
          className="addr"
          placeholder="Adresse (0–65535)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button className="btn btn-primary btn-sm" onClick={handleCreate}>
          + GA
        </button>
        {formError && <span className="form-error">{formError}</span>}
      </div>

      <div className="panel-body">
        {groupAddresses.map((ga) => {
          const isLinkedToSelected = linkedToSelected.has(ga.id);
          const isLinkedAnywhere = allLinkedIds.has(ga.id);
          return (
            <div key={ga.id} className={`ga-item${isLinkedAnywhere ? ' linked' : ''}`}>
              <span className="ga-addr">{toGroupAddressString(ga.address)}</span>
              <span className="ga-name">{ga.name || ga.id}</span>
              {ga.dpt && <span className="ga-dpt">{ga.dpt}</span>}
              {selectedKo && (
                isLinkedToSelected ? (
                  <span style={{ fontSize: 12, color: '#198754' }}>✓ verknüpft</span>
                ) : (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => onAddLink(ga.id)}
                  >
                    Verknüpfen
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
