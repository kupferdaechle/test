import { useState, useMemo } from 'react';

export default function DevicePanel({ devices, links, selectedKo, onSelectKo, onRemoveLink, onSetSending }) {
  const [openDevices, setOpenDevices] = useState(new Set());

  // Index links by deviceId
  const linksByDevice = useMemo(() => {
    const m = new Map();
    for (const link of links) {
      if (!link.deviceId) continue;
      if (!m.has(link.deviceId)) m.set(link.deviceId, []);
      m.get(link.deviceId).push(link);
    }
    return m;
  }, [links]);

  const toggle = (id) =>
    setOpenDevices((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="panel">
      <div className="panel-header">
        <span>Geräte &amp; KOs</span>
        <span className="badge">{devices.length}</span>
      </div>
      <div className="panel-body">
        {devices.map((dev) => {
          const devLinks = linksByDevice.get(dev.id) ?? [];
          const isOpen = openDevices.has(dev.id);
          return (
            <div key={dev.id} className="device-item">
              <div
                className={`device-row${isOpen ? ' open' : ''}`}
                onClick={() => toggle(dev.id)}
              >
                <span className="chevron">▶</span>
                <span className="device-name">{dev.name || dev.id}</span>
                {dev.physicalAddress && (
                  <span className="device-addr">{dev.physicalAddress}</span>
                )}
                {devLinks.length > 0 && (
                  <span className="badge">{devLinks.length}</span>
                )}
              </div>
              {isOpen && devLinks.length > 0 && (
                <div className="ko-list">
                  {devLinks.map((link) => {
                    const isSelected =
                      selectedKo?.comObjectRefId === link.comObjectRefId;
                    return (
                      <div key={link.comObjectRefId}>
                        <div
                          className={`ko-row${isSelected ? ' selected' : ''}`}
                          onClick={() =>
                            onSelectKo(
                              isSelected
                                ? null
                                : { comObjectRefId: link.comObjectRefId, deviceId: dev.id },
                            )
                          }
                        >
                          <span className="ko-name">
                            {link.ko?.name || link.ko?.text || link.comObjectRefId}
                          </span>
                          {link.ko?.dpt && (
                            <span className="ko-dpt">{link.ko.dpt}</span>
                          )}
                        </div>
                        {link.groupAddressIds.length > 0 && (
                          <div className="ko-gas">
                            {link.groupAddressIds.map((gaId, i) => (
                              <span
                                key={gaId}
                                className={`ga-chip${i === 0 ? ' sending' : ''}`}
                              >
                                {i === 0 ? '↑ ' : ''}
                                {gaId.match(/GA-\d+$/)?.[0] ?? gaId}
                                <button
                                  title="Verknüpfung entfernen"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveLink(link.comObjectRefId, gaId);
                                  }}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
