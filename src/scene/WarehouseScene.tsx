import { Canvas } from '@react-three/fiber';
import { useWarehouseStore, SITE_ZOOM } from '../store/useWarehouseStore';
import { CAMERA_OFFSET } from './camera';
import { CameraRig, SunLight } from './CameraRig';
import { Docks } from './Docks';
import { Environment } from './Environment';
import { Racks } from './Racks';
import { LabelProjector, SelectionOverlay } from './Selection';
import { SCENE } from './theme';
import { Forklifts, Trucks } from './Vehicles';

const start = useWarehouseStore.getState().cameraFocus;

/** 3D view. Reads the store and reports clicks; holds no business logic. */
export function WarehouseScene() {
  return (
    <Canvas
      className="scene"
      orthographic
      shadows="soft"
      dpr={[1, 1.5]}
      camera={{
        position: [start.x + CAMERA_OFFSET.x, CAMERA_OFFSET.y, start.z + CAMERA_OFFSET.z],
        zoom: SITE_ZOOM,
        near: 1,
        far: 1000,
      }}
      onPointerMissed={() => useWarehouseStore.getState().select(null)}
    >
      <color attach="background" args={[SCENE.background]} />
      <hemisphereLight args={['#c9d4e2', '#3a3f47', 1.4]} />
      <SunLight />
      <CameraRig />

      <Environment />
      <Docks />
      <Racks />
      <Trucks />
      <Forklifts />
      <SelectionOverlay />
      <LabelProjector />
    </Canvas>
  );
}

