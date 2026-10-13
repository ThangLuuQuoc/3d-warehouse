import { useShallow } from 'zustand/react/shallow';
import { isDelayed, openShipmentsOfSite } from '../store/selectors';
import { useWarehouseStore } from '../store/useWarehouseStore';
import { SHIPMENT_STATUS_LABEL, formatClock, formatEta } from './format';
import { Badge, Icon } from './primitives';

const STATUS_COLOR = {
  scheduled: 'var(--muted)',
  in_transit: 'var(--blue)',
  at_dock: 'var(--amber)',
  delivered: 'var(--good)',
} as const;

/** Bottom-left: open shipments of the active site, soonest first. */
export function ShipmentsPanel() {
  const siteId = useWarehouseStore((s) => s.activeSiteId);
  const delayedOnly = useWarehouseStore((s) => s.filters.delayedOnly);
  const shipments = useWarehouseStore(useShallow((s) => openShipmentsOfSite(s, siteId)));
  const now = useWarehouseStore((s) => s.simTime);

  const open = (truckId: string | null) => {
    if (!truckId) return;
    const truck = useWarehouseStore.getState().trucks[truckId];
    useWarehouseStore.getState().select({ kind: 'truck', id: truckId }, truck.pose);
  };

  return (
    <section className="panel shipments" aria-label="Shipments">
      <header className="panel__head">
        <Icon name="truck" />
        <h2>Shipments</h2>
        <span className="muted">
          {siteId} · {shipments.length} {delayedOnly ? 'delayed' : 'open'}
        </span>
      </header>
      {shipments.length === 0 ? (
        <p className="empty">{delayedOnly ? 'No delayed shipments. Everything is on schedule.' : 'No open shipments.'}</p>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Shipment</th>
                <th>Partner</th>
                <th>Status</th>
                <th>Truck</th>
                <th className="num">ETA</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((sh) => {
                const late = isDelayed(sh, now);
                return (
                  <tr
                    key={sh.id}
                    className={sh.truckId ? 'is-clickable' : undefined}
                    tabIndex={sh.truckId ? 0 : undefined}
                    onClick={() => open(sh.truckId)}
                    onKeyDown={(e) => e.key === 'Enter' && open(sh.truckId)}
                  >
                    <td>
                      <span className="mono">{sh.id}</span>
                      <span className={`dir dir--${sh.direction}`}>{sh.direction === 'inbound' ? 'IN' : 'OUT'}</span>
                    </td>
                    <td className="ellipsis" title={`${sh.counterparty}, ${sh.city}`}>
                      {sh.counterparty}
                    </td>
                    <td>
                      <Badge color={STATUS_COLOR[sh.status]}>{SHIPMENT_STATUS_LABEL[sh.status]}</Badge>
                    </td>
                    <td className="mono">{sh.truckId ?? <span className="muted">—</span>}</td>
                    <td className={`num ${late ? 'text-bad' : ''}`}>
                      {formatClock(sh.eta)}
                      <div className="eta-rel">{formatEta(sh.eta, now)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
