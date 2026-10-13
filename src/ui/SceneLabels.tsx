import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { rowLabel } from '../data/layout';
import { SELECTION_LABEL, bindLabelElement, siteLabelId } from '../scene/labelAnchors';
import { useWarehouseStore, type WarehouseState } from '../store/useWarehouseStore';
import { DOCK_DIRECTION_LABEL, FORKLIFT_STATUS_LABEL, TRUCK_STATUS_LABEL } from './format';

const selectionText = (s: WarehouseState): string | null => {
  const sel = s.selection;
  if (!sel) return null;
  switch (sel.kind) {
    case 'truck':
      return `${sel.id} · ${TRUCK_STATUS_LABEL[s.trucks[sel.id].status]}`;
    case 'forklift':
      return `${sel.id} · ${FORKLIFT_STATUS_LABEL[s.forklifts[sel.id].status]}`;
    case 'dock': {
      const d = s.docks[sel.id];
      return `${d.siteId} · ${d.label} ${DOCK_DIRECTION_LABEL[d.direction]}`;
    }
    case 'rack':
      return `${sel.id} · Row ${rowLabel(sel.row)}`;
    case 'item':
      return s.inventory[sel.id].name;
    case 'site':
      return `${sel.id} · ${s.sites[sel.id].name}`;
  }
};

function SiteTag({ siteId }: { siteId: string }) {
  const name = useWarehouseStore((s) => s.sites[siteId].name);
  const ref = useCallback((el: HTMLButtonElement | null) => bindLabelElement(siteLabelId(siteId), el), [siteId]);
  return (
    <button ref={ref} className="site-tag" onClick={() => useWarehouseStore.getState().showSite(siteId)}>
      <span className="site-tag__code">{siteId}</span>
      {name}
    </button>
  );
}

const bindSelection = (el: HTMLDivElement | null) => bindLabelElement(SELECTION_LABEL, el);

/** HTML labels pinned to 3D positions. The scene's LabelProjector moves them every frame. */
export function SceneLabels() {
  const siteIds = useWarehouseStore(useShallow((s) => Object.keys(s.sites)));
  const text = useWarehouseStore(selectionText);
  return (
    <div className="scene-labels">
      {siteIds.map((id) => (
        <SiteTag key={id} siteId={id} />
      ))}
      {text && (
        <div ref={bindSelection} className="scene-label">
          {text}
        </div>
      )}
    </div>
  );
}
