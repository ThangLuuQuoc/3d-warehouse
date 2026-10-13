import { useWarehouseStore, type CameraPreset } from '../store/useWarehouseStore';
import { Icon, type IconName } from './primitives';

const PRESETS: { id: CameraPreset; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Overview', icon: 'map' },
  { id: 'docks', label: 'Dock bays', icon: 'dock' },
  { id: 'racks', label: 'High racks', icon: 'rack' },
  { id: 'reset', label: 'Reset view', icon: 'reset' },
];

/** RTS-style camera shortcuts; the camera glides to each preset. */
export function CameraPresets() {
  const focusPreset = useWarehouseStore((s) => s.focusPreset);
  return (
    <nav className="presets" aria-label="Camera presets">
      {PRESETS.map((p) => (
        <button key={p.id} className="presets__button" onClick={() => focusPreset(p.id)} title={p.label}>
          <Icon name={p.icon} size={16} />
          <span>{p.label}</span>
        </button>
      ))}
    </nav>
  );
}
