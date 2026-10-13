import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { dockDoorPose } from '../data/layout';
import type { Dock } from '../data/types';
import { FORKLIFT_STATUS_COLOR, TRUCK_STATUS_COLOR } from '../scene/theme';
import { docksOfSite, forkliftsOfSite, shipmentForTruck, truckAtDock, truckMatchesFilters, trucksOfSite } from '../store/selectors';
import { useWarehouseStore } from '../store/useWarehouseStore';
import { FORKLIFT_STATUS_LABEL, TRUCK_STATUS_LABEL } from './format';
import { Badge, Icon, Meter } from './primitives';

type Tab = 'docks' | 'forklifts' | 'trucks';
const select = useWarehouseStore.getState().select;

function DockRow({ dock }: { dock: Dock }) {
  const truck = useWarehouseStore((s) => truckAtDock(s, dock.id));
  const site = useWarehouseStore((s) => s.sites[dock.siteId]);
  const state = dock.outOfService ? 'Out of service' : truck ? TRUCK_STATUS_LABEL[truck.status] : 'Available';
  const color = dock.outOfService ? 'var(--bad)' : truck ? TRUCK_STATUS_COLOR[truck.status] : 'var(--good)';
  return (
    <li>
      <button className="list__row" onClick={() => select({ kind: 'dock', id: dock.id }, dockDoorPose(site, dock.index))}>
        <span className="list__main">
          <span className="mono">{dock.label}</span>
          <span className="muted">{truck ? truck.id : 'No truck'}</span>
        </span>
        <Badge color={color}>{state}</Badge>
        {truck && (truck.status === 'loading' || truck.status === 'unloading') ? (
          <span className="list__meter">
            <Meter value={truck.progress} color={color} />
          </span>
        ) : (
          <span className="list__meter" />
        )}
      </button>
    </li>
  );
}

function TruckRows({ siteId }: { siteId: string }) {
  const trucks = useWarehouseStore(useShallow((s) => trucksOfSite(s, siteId).filter((t) => truckMatchesFilters(s, t.id))));
  const jobs = useWarehouseStore(useShallow((s) => trucks.map((t) => shipmentForTruck(s, t.id))));
  if (!trucks.length) return <p className="empty">No trucks match the current filters.</p>;
  return (
    <ul className="list">
      {trucks.map((t, i) => (
        <li key={t.id}>
          <button className="list__row" onClick={() => select({ kind: 'truck', id: t.id }, t.pose)}>
            <span className="list__main">
              <span className="mono">{t.id}</span>
              <span className="muted">{t.carrier}</span>
            </span>
            <span className="muted mono">{jobs[i]?.id ?? '—'}</span>
            <Badge color={TRUCK_STATUS_COLOR[t.status]}>{TRUCK_STATUS_LABEL[t.status]}</Badge>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Bottom-right: docks, forklifts and trucks of the active site. */
export function FleetPanel() {
  const [tab, setTab] = useState<Tab>('docks');
  const siteId = useWarehouseStore((s) => s.activeSiteId);
  const docks = useWarehouseStore(useShallow((s) => docksOfSite(s, siteId)));
  const forklifts = useWarehouseStore(useShallow((s) => forkliftsOfSite(s, siteId)));
  const counts = useWarehouseStore(
    useShallow((s) => ({
      docksBusy: docks.filter((d) => truckAtDock(s, d.id)).length,
      trucks: trucksOfSite(s, siteId).length,
    })),
  );
  const working = forklifts.filter((f) => f.status === 'loading' || f.status === 'unloading').length;

  return (
    <section className="panel fleet" aria-label="Fleet">
      <header className="panel__head">
        <Icon name="dock" />
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'docks'} onClick={() => setTab('docks')}>
            Docks <span className="muted">{counts.docksBusy}/{docks.length}</span>
          </button>
          <button role="tab" aria-selected={tab === 'forklifts'} onClick={() => setTab('forklifts')}>
            Forklifts <span className="muted">{working}/{forklifts.length}</span>
          </button>
          <button role="tab" aria-selected={tab === 'trucks'} onClick={() => setTab('trucks')}>
            Trucks <span className="muted">{counts.trucks}</span>
          </button>
        </div>
      </header>
      <div className="fleet__body">
        {tab === 'docks' && (
          <ul className="list">
            {docks.map((d) => (
              <DockRow key={d.id} dock={d} />
            ))}
          </ul>
        )}
        {tab === 'forklifts' && (
          <ul className="list">
            {forklifts.map((f) => (
              <li key={f.id}>
                <button className="list__row" onClick={() => select({ kind: 'forklift', id: f.id }, f.pose)}>
                  <span className="list__main">
                    <span className="mono">{f.id}</span>
                    <span className="muted">{f.dockId ? f.dockId.replace(`${siteId}-`, 'Dock ') : 'Floor'}</span>
                  </span>
                  <Badge color={FORKLIFT_STATUS_COLOR[f.status]}>{FORKLIFT_STATUS_LABEL[f.status]}</Badge>
                  <span className="list__meter">
                    <Meter value={f.battery / 100} color={f.battery < 25 ? 'var(--bad)' : 'var(--good)'} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {tab === 'trucks' && <TruckRows siteId={siteId} />}
      </div>
    </section>
  );
}
