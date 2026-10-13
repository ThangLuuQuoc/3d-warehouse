import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { ID } from '../data/types';
import { siteKpis } from '../store/selectors';
import { useWarehouseStore } from '../store/useWarehouseStore';
import { formatClock } from './format';
import { Icon } from './primitives';

function SiteOption({ siteId }: { siteId: ID }) {
  const site = useWarehouseStore((s) => s.sites[siteId]);
  const k = useWarehouseStore(useShallow((s) => siteKpis(s, siteId)));
  return (
    <>
      <span className="site-chip">{site.id}</span>
      <span className="site-option__text">
        <span className="site-option__name">{site.name}</span>
        <span className="site-option__meta">
          {Math.round((k.palletsStored / k.palletCapacity) * 100)}% full · {k.docksInUse}/{k.docksTotal} docked
        </span>
      </span>
    </>
  );
}

function SiteSelector() {
  const siteIds = useWarehouseStore(useShallow((s) => Object.keys(s.sites)));
  const activeSiteId = useWarehouseStore((s) => s.activeSiteId);
  const setActiveSite = useWarehouseStore((s) => s.setActiveSite);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="site-select" ref={root}>
      <button className="site-select__button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <SiteOption siteId={activeSiteId} />
        <Icon name="chevron" size={16} />
      </button>
      {open && (
        <ul className="site-select__menu" role="listbox" aria-label="Sites">
          {siteIds.map((id) => (
            <li key={id} role="option" aria-selected={id === activeSiteId}>
              <button
                className="site-select__option"
                onClick={() => {
                  setActiveSite(id);
                  setOpen(false);
                }}
              >
                <SiteOption siteId={id} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LiveClock() {
  const simTime = useWarehouseStore((s) => s.simTime);
  return (
    <div className="live" title="Simulated clock: 1 minute every 2 seconds">
      <span className="live__dot" />
      Live
      <span className="live__time">{formatClock(simTime)}</span>
    </div>
  );
}

export function TopBar() {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__mark" aria-hidden>
          <Icon name="box" size={18} />
        </span>
        WareTrack
      </div>
      <SiteSelector />
      <div className="topbar__spacer" />
      <LiveClock />
    </header>
  );
}
