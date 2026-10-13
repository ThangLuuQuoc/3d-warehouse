import { useShallow } from 'zustand/react/shallow';
import { TRUCK_STATUS_COLOR } from '../scene/theme';
import { siteKpis } from '../store/selectors';
import { useWarehouseStore, type Filters } from '../store/useWarehouseStore';
import { TRUCK_STATUS_LABEL, formatPercent } from './format';
import { Icon, type IconName } from './primitives';

function Kpi({ icon, label, value, sub, tone }: { icon: IconName; label: string; value: string; sub: string; tone?: 'good' | 'warn' | 'bad' }) {
  return (
    <div className={`kpi ${tone ? `kpi--${tone}` : ''}`}>
      <span className="kpi__icon">
        <Icon name={icon} />
      </span>
      <div>
        <div className="kpi__label">{label}</div>
        <div className="kpi__value">{value}</div>
        <div className="kpi__sub">{sub}</div>
      </div>
    </div>
  );
}

export function KpiPanel() {
  const siteId = useWarehouseStore((s) => s.activeSiteId);
  const k = useWarehouseStore(useShallow((s) => siteKpis(s, siteId)));
  const onTimeTone = k.onTimeRate === null ? undefined : k.onTimeRate >= 0.9 ? 'good' : k.onTimeRate >= 0.75 ? 'warn' : 'bad';

  return (
    <section className="kpis" aria-label={`KPIs for ${siteId}`}>
      <Kpi
        icon="clock"
        label="On-time delivery"
        value={formatPercent(k.onTimeRate)}
        sub={`${k.deliveredCount - k.lateCount}/${k.deliveredCount} delivered · ${k.delayedOpen} delayed now`}
        tone={onTimeTone}
      />
      <Kpi icon="dock" label="Docks in use" value={`${k.docksInUse}/${k.docksTotal}`} sub={`${k.docksTotal - k.docksInUse} free · ${siteId}`} />
      <Kpi icon="truck" label="Active trucks" value={String(k.activeTrucks)} sub={`${k.trucksOnSite} on site · ${k.trucksArriving} arriving`} />
      <Kpi
        icon="alert"
        label="Low-stock alerts"
        value={String(k.lowStock)}
        sub={`${k.palletsStored}/${k.palletCapacity} pallets stored`}
        tone={k.lowStock ? 'bad' : 'good'}
      />
    </section>
  );
}

const STATUS_FILTERS: Filters['truckStatus'][] = ['all', 'in_transit', 'waiting', 'docking', 'loading', 'unloading', 'departing', 'maintenance'];

export function FilterBar() {
  const filters = useWarehouseStore((s) => s.filters);
  const setDelayedOnly = useWarehouseStore((s) => s.setDelayedOnly);
  const setTruckStatusFilter = useWarehouseStore((s) => s.setTruckStatusFilter);

  return (
    <section className="filters" aria-label="Filters">
      <div className="segmented" role="group" aria-label="Shipments">
        <button aria-pressed={!filters.delayedOnly} onClick={() => setDelayedOnly(false)}>
          All shipments
        </button>
        <button aria-pressed={filters.delayedOnly} onClick={() => setDelayedOnly(true)} className="segmented__warn">
          Delayed only
        </button>
      </div>
      <div className="chips" role="group" aria-label="Truck status">
        {STATUS_FILTERS.map((st) => (
          <button
            key={st}
            className="chip"
            aria-pressed={filters.truckStatus === st}
            onClick={() => setTruckStatusFilter(st)}
            style={st === 'all' ? undefined : ({ '--dot': TRUCK_STATUS_COLOR[st] } as React.CSSProperties)}
          >
            {st !== 'all' && <span className="chip__dot" />}
            {st === 'all' ? 'All trucks' : TRUCK_STATUS_LABEL[st]}
          </button>
        ))}
      </div>
    </section>
  );
}
