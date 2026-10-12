import { WarehouseScene } from './scene/WarehouseScene';
import { useSimulation } from './sim/useSimulation';
import { CameraPresets } from './ui/CameraPresets';
import { FleetPanel } from './ui/FleetPanel';
import { InspectorPanel } from './ui/InspectorPanel';
import { FilterBar, KpiPanel } from './ui/KpiPanel';
import { SceneLabels } from './ui/SceneLabels';
import { ShipmentsPanel } from './ui/ShipmentsPanel';
import { TopBar } from './ui/TopBar';

export function App() {
  useSimulation();
  return (
    <div className="app">
      <WarehouseScene />
      <SceneLabels />
      <div className="hud">
        <TopBar />
        <div className="hud__top">
          <KpiPanel />
          <FilterBar />
        </div>
        <div className="hud__right">
          <InspectorPanel />
          <FleetPanel />
        </div>
        <div className="hud__left">
          <CameraPresets />
          <ShipmentsPanel />
        </div>
      </div>
    </div>
  );
}
