import type { ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { MAX_PALLETS_PER_RUN, rowLabel } from '../data/layout';
import type { ID, Shipment, Timestamp } from '../data/types';
import { FORKLIFT_STATUS_COLOR, TRUCK_STATUS_COLOR } from '../scene/theme';
import {
  docksOfSite,
  forkliftsAtDock,
  forkliftsOfSite,
  isDelayed,
  isLowStock,
  isTruckAway,
  itemsOfSite,
  palletsOnHand,
  shipmentForTruck,
  siteKpis,
  truckAtDock,
} from '../store/selectors';
import { useWarehouseStore } from '../store/useWarehouseStore';
import {
  DOCK_DIRECTION_LABEL,
  FORKLIFT_STATUS_LABEL,
  SHIPMENT_STATUS_LABEL,
  SITE_KIND_LABEL,
  TRUCK_STATUS_LABEL,
  formatAgo,
  formatClock,
  formatEta,
  formatNumber,
} from './format';
import { Badge, Icon, Meter, type IconName } from './primitives';

const select = useWarehouseStore.getState().select;

// ─── Layout pieces ───────────────────────────────────────────────────────────

function Shell({
  icon,
  eyebrow,
  title,
  sub,
  closable = true,
  children,
}: {
  icon: IconName;
  eyebrow: string;
  title: string;
  sub?: string;
  closable?: boolean;
  children: ReactNode;
}) {
  return (
    <aside className="panel inspector" aria-label={`${title} details`}>
      <header className="inspector__head">
        <span className="inspector__icon">
          <Icon name={icon} size={22} />
        </span>
        <div className="inspector__titles">
          <div className="eyebrow">{eyebrow}</div>
          <h2>{title}</h2>
          {sub && <div className="inspector__sub">{sub}</div>}
        </div>
        {closable && (
          <button className="icon-button" onClick={() => select(null)} aria-label="Close details">
            <Icon name="close" size={16} />
          </button>
        )}
      </header>
      {children}
    </aside>
  );
}

function Rows({ children }: { children: ReactNode }) {
  return <dl className="kv">{children}</dl>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="kv__row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Updated({ at }: { at: Timestamp }) {
  const now = useWarehouseStore((s) => s.simTime);
  return (
    <footer className="inspector__updated">
      <span className="live__dot" /> Last update {formatClock(at)} · {formatAgo(at, now)}
    </footer>
  );
}

function ShipmentLink({ shipment }: { shipment: Shipment | null }) {
  const now = useWarehouseStore((s) => s.simTime);
  if (!shipment) return <span className="muted">None</span>;
  return (
    <span className={isDelayed(shipment, now) ? 'text-bad' : undefined}>
      <span className="mono">{shipment.id}</span> · {SHIPMENT_STATUS_LABEL[shipment.status]}
    </span>
  );
}

function ShipmentRows({ shipment }: { shipment: Shipment | null }) {
  const now = useWarehouseStore((s) => s.simTime);
  return (
    <>
      <Row label="Current shipment">
        <ShipmentLink shipment={shipment} />
      </Row>
      {shipment && (
        <>
          <Row label={shipment.direction === 'inbound' ? 'Supplier' : 'Customer'}>{shipment.counterparty}</Row>
          <Row label="Route">
            {shipment.direction === 'inbound' ? `${shipment.city} → ${shipment.siteId}` : `${shipment.siteId} → ${shipment.city}`}
          </Row>
          <Row label="ETA">
            <span className={isDelayed(shipment, now) ? 'text-bad' : undefined}>
              {formatClock(shipment.eta)} ({formatEta(shipment.eta, now)})
            </span>
          </Row>
          <Row label="Cargo">{shipment.pallets} pallets</Row>
        </>
      )}
    </>
  );
}

// ─── Views ───────────────────────────────────────────────────────────────────

function TruckView({ id }: { id: ID }) {
  const truck = useWarehouseStore((s) => s.trucks[id]);
  const shipment = useWarehouseStore((s) => shipmentForTruck(s, id));
  const away = useWarehouseStore((s) => isTruckAway(s, s.trucks[id]));
  const dock = useWarehouseStore((s) => (truck.dockId ? s.docks[truck.dockId] : null));
  const working = truck.status === 'loading' || truck.status === 'unloading';

  const where = dock
    ? `${truck.siteId} · ${dock.label}`
    : away && shipment
      ? `To ${shipment.city}`
      : truck.status === 'in_transit'
        ? `To ${truck.siteId}`
        : `${truck.siteId} · Yard`;

  return (
    <Shell icon="truck" eyebrow={truck.carrier} title={truck.id} sub={`${truck.driver} · ${truck.plate}`}>
      <div className="inspector__status">
        <Badge color={TRUCK_STATUS_COLOR[truck.status]}>{TRUCK_STATUS_LABEL[truck.status]}</Badge>
        <span>{where}</span>
      </div>
      {working && (
        <div className="inspector__progress">
          <Meter value={truck.progress} color={TRUCK_STATUS_COLOR[truck.status]} />
          <span className="mono">{Math.round(truck.progress * 100)}%</span>
        </div>
      )}
      <Rows>
        <ShipmentRows shipment={shipment} />
        <Row label="Bay">{dock ? `${dock.label} · ${DOCK_DIRECTION_LABEL[dock.direction]}` : '—'}</Row>
        <Row label="Capacity">{truck.capacityPallets} pallets</Row>
      </Rows>
      <Updated at={truck.updatedAt} />
    </Shell>
  );
}

function ForkliftView({ id }: { id: ID }) {
  const f = useWarehouseStore((s) => s.forklifts[id]);
  const dock = useWarehouseStore((s) => (f.dockId ? s.docks[f.dockId] : null));
  const truck = useWarehouseStore((s) => (f.dockId ? truckAtDock(s, f.dockId) : null));
  const shipment = useWarehouseStore((s) => (truck ? shipmentForTruck(s, truck.id) : null));
  const batteryColor = f.battery < 25 ? 'var(--bad)' : f.battery < 50 ? 'var(--amber)' : 'var(--good)';

  return (
    <Shell icon="forklift" eyebrow={`Forklift · ${f.siteId}`} title={f.id} sub={f.model}>
      <div className="inspector__status">
        <Badge color={FORKLIFT_STATUS_COLOR[f.status]}>{FORKLIFT_STATUS_LABEL[f.status]}</Badge>
        <span>{dock ? `${f.siteId} · ${dock.label}` : f.status === 'charging' ? 'Charging bay' : 'Aisle'}</span>
      </div>
      <div className="inspector__progress">
        <Meter value={f.battery / 100} color={batteryColor} />
        <span className="mono">{Math.round(f.battery)}%</span>
      </div>
      <Rows>
        <Row label="Working truck">{truck ? <span className="mono">{truck.id}</span> : <span className="muted">None</span>}</Row>
        <ShipmentRows shipment={shipment} />
      </Rows>
      <Updated at={f.updatedAt} />
    </Shell>
  );
}

function DockView({ id }: { id: ID }) {
  const dock = useWarehouseStore((s) => s.docks[id]);
  const truck = useWarehouseStore((s) => truckAtDock(s, id));
  const shipment = useWarehouseStore((s) => (truck ? shipmentForTruck(s, truck.id) : null));
  const crew = useWarehouseStore(useShallow((s) => forkliftsAtDock(s, id)));
  const state = dock.outOfService ? 'Out of service' : truck ? 'Occupied' : 'Available';
  const color = dock.outOfService ? 'var(--bad)' : truck ? 'var(--amber)' : 'var(--good)';

  return (
    <Shell icon="dock" eyebrow={`Dock · ${dock.siteId}`} title={`${dock.label} · ${DOCK_DIRECTION_LABEL[dock.direction]}`}>
      <div className="inspector__status">
        <Badge color={color}>{state}</Badge>
        {truck && <span>{TRUCK_STATUS_LABEL[truck.status]}</span>}
      </div>
      <Rows>
        <Row label="Truck">
          {truck ? (
            <button className="link mono" onClick={() => select({ kind: 'truck', id: truck.id })}>
              {truck.id}
            </button>
          ) : (
            <span className="muted">None</span>
          )}
        </Row>
        <ShipmentRows shipment={shipment} />
        <Row label="Forklifts">{crew.length ? crew.map((f) => f.id).join(', ') : <span className="muted">None</span>}</Row>
      </Rows>
      {truck && <Updated at={truck.updatedAt} />}
    </Shell>
  );
}

function ItemView({ id }: { id: ID }) {
  const item = useWarehouseStore((s) => s.inventory[id]);
  const now = useWarehouseStore((s) => s.simTime);
  const incoming = useWarehouseStore(
    useShallow((s) => Object.values(s.shipments).filter((sh) => sh.direction === 'inbound' && sh.status !== 'delivered' && sh.lines.some((l) => l.itemId === id))),
  );
  const low = isLowStock(item);

  return (
    <Shell icon="box" eyebrow={`Pallet · ${item.category}`} title={item.name} sub={`${item.sku} · ${item.id}`}>
      <div className="inspector__status">
        <Badge color={low ? 'var(--bad)' : 'var(--good)'}>{low ? 'Low stock' : 'In stock'}</Badge>
        <span>
          {item.siteId} · Row {rowLabel(item.location.row)} · Level {item.location.level + 1}
        </span>
      </div>
      <div className="inspector__progress">
        <Meter value={item.quantity / (item.reorderPoint * 3)} color={low ? 'var(--bad)' : 'var(--good)'} />
        <span className="mono">{formatNumber(item.quantity)}</span>
      </div>
      <Rows>
        <Row label="Quantity">
          {formatNumber(item.quantity)} {item.unit}
        </Row>
        <Row label="Reorder point">
          {formatNumber(item.reorderPoint)} {item.unit}
        </Row>
        <Row label="Pallets on hand">{palletsOnHand(item)}</Row>
        <Row label="Incoming">
          {incoming.length ? (
            incoming.map((sh) => (
              <div key={sh.id}>
                <span className="mono">{sh.id}</span> · {formatEta(sh.eta, now)}
              </div>
            ))
          ) : (
            <span className="muted">None</span>
          )}
        </Row>
      </Rows>
      <Updated at={item.updatedAt} />
    </Shell>
  );
}

function RackView({ siteId, row }: { siteId: ID; row: number }) {
  const items = useWarehouseStore(useShallow((s) => itemsOfSite(s, siteId).filter((i) => i.location.row === row)));
  const sorted = [...items].sort((a, b) => a.location.level - b.location.level || a.location.bay - b.location.bay);
  return (
    <Shell icon="rack" eyebrow={`Pallet rack · ${siteId}`} title={`Row ${rowLabel(row)}`} sub={`${items.length} SKUs on 3 levels`}>
      <ul className="list">
        {sorted.map((i) => (
          <li key={i.id}>
            <button className="list__row" onClick={() => select({ kind: 'item', id: i.id })}>
              <span className="list__main">
                <span>{i.name}</span>
                <span className="muted">
                  L{i.location.level + 1} · bays {i.location.bay + 1}–{i.location.bay + MAX_PALLETS_PER_RUN}
                </span>
              </span>
              <span className="mono">{formatNumber(i.quantity)}</span>
              <Badge color={isLowStock(i) ? 'var(--bad)' : 'var(--good)'}>{isLowStock(i) ? 'Low' : 'OK'}</Badge>
            </button>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function SiteView({ id, closable }: { id: ID; closable: boolean }) {
  const site = useWarehouseStore((s) => s.sites[id]);
  const k = useWarehouseStore(useShallow((s) => siteKpis(s, id)));
  const items = useWarehouseStore(useShallow((s) => itemsOfSite(s, id)));
  const forklifts = useWarehouseStore(useShallow((s) => forkliftsOfSite(s, id)));
  const docks = useWarehouseStore(useShallow((s) => docksOfSite(s, id)));
  const outOfService = docks.filter((d) => d.outOfService).length;
  const lowFirst = [...items].sort((a, b) => Number(isLowStock(b)) - Number(isLowStock(a)) || a.name.localeCompare(b.name));
  const working = forklifts.filter((f) => f.status === 'loading' || f.status === 'unloading').length;

  return (
    <Shell icon="site" eyebrow={`${SITE_KIND_LABEL[site.kind]} · ${site.id}`} title={site.name} sub={site.address} closable={closable}>
      <div className="inspector__status">
        <Badge color={outOfService ? 'var(--amber)' : 'var(--good)'}>{outOfService ? 'Degraded' : 'Operational'}</Badge>
        <span>
          {k.docksInUse} docked · {k.trucksArriving} arriving
        </span>
      </div>
      <div className="tiles">
        <div className="tile">
          <div className="tile__label">Stock on hand</div>
          <div className="tile__value">
            {k.palletsStored} <span className="muted">/ {k.palletCapacity}</span>
          </div>
          <Meter value={k.palletsStored / k.palletCapacity} />
        </div>
        <div className="tile">
          <div className="tile__label">Truck bays</div>
          <div className="tile__value">
            {k.docksInUse} <span className="muted">/ {k.docksTotal} busy</span>
          </div>
          <Meter value={k.docksInUse / k.docksTotal} color="var(--good)" />
        </div>
      </div>
      <h3 className="section-title">
        Inventory <span className="muted">{items.length} SKUs</span>
      </h3>
      <ul className="list list--scroll">
        {lowFirst.map((i) => (
          <li key={i.id}>
            <button className="list__row" onClick={() => select({ kind: 'item', id: i.id })}>
              <span className="list__main">
                <span>{i.name}</span>
              </span>
              <span className="mono">{formatNumber(i.quantity)}</span>
              <Badge color={isLowStock(i) ? 'var(--bad)' : 'var(--good)'}>{isLowStock(i) ? 'Low stock' : 'In stock'}</Badge>
            </button>
          </li>
        ))}
      </ul>
      <h3 className="section-title">
        Forklift fleet{' '}
        <span className="muted">
          {working}/{forklifts.length} working
        </span>
      </h3>
      <ul className="list">
        {forklifts.map((f) => (
          <li key={f.id}>
            <button className="list__row" onClick={() => select({ kind: 'forklift', id: f.id }, f.pose)}>
              <span className="list__main">
                <span className="mono">{f.id}</span>
              </span>
              <Badge color={FORKLIFT_STATUS_COLOR[f.status]}>{FORKLIFT_STATUS_LABEL[f.status]}</Badge>
              <span className="mono muted">{Math.round(f.battery)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

/** Right-hand panel: details of the selected object, or the active site when nothing is selected. */
export function InspectorPanel() {
  const selection = useWarehouseStore((s) => s.selection);
  const activeSiteId = useWarehouseStore((s) => s.activeSiteId);

  if (!selection) return <SiteView id={activeSiteId} closable={false} />;
  switch (selection.kind) {
    case 'truck':
      return <TruckView key={selection.id} id={selection.id} />;
    case 'forklift':
      return <ForkliftView key={selection.id} id={selection.id} />;
    case 'dock':
      return <DockView key={selection.id} id={selection.id} />;
    case 'item':
      return <ItemView key={selection.id} id={selection.id} />;
    case 'rack':
      return <RackView key={`${selection.id}:${selection.row}`} siteId={selection.id} row={selection.row} />;
    case 'site':
      return <SiteView key={selection.id} id={selection.id} closable />;
  }
}

