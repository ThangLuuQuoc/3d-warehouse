import { Outlines } from '@react-three/drei';
import { memo, useRef } from 'react';
import type * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import type { ID } from '../data/types';
import { truckMatchesFilters } from '../store/selectors';
import { useWarehouseStore } from '../store/useWarehouseStore';
import { usePick, useSmoothPose } from './hooks';
import { forkliftGeometry, forkliftLoadGeometry, truckGeometry, vehicleMaterial } from './models';
import { SelectionMarker } from './Selection';
import { SCENE } from './theme';

/** Selected objects get an amber outline; hovered ones a dimmer one. */
function Highlight({ selected, hovered }: { selected: boolean; hovered: boolean }) {
  if (selected) return <Outlines thickness={3} color={SCENE.selection} />;
  if (hovered) return <Outlines thickness={2} color={SCENE.hover} />;
  return null;
}

const Truck = memo(function Truck({ id }: { id: ID }) {
  const truck = useWarehouseStore((s) => s.trucks[id]);
  const visible = useWarehouseStore((s) => truckMatchesFilters(s, id));
  const selected = useWarehouseStore((s) => s.selection?.kind === 'truck' && s.selection.id === id);
  const ref = useRef<THREE.Group>(null);
  useSmoothPose(ref, truck.pose, 2.2, selected ? 5.6 : null);
  const { handlers, hovered } = usePick(() => useWarehouseStore.getState().select({ kind: 'truck', id }));

  if (!visible) return null;
  return (
    <group ref={ref} {...handlers}>
      <mesh geometry={truckGeometry(truck.carrier)} material={vehicleMaterial} castShadow receiveShadow>
        <Highlight selected={selected} hovered={hovered} />
      </mesh>
      {selected && <SelectionMarker radius={6.2} />}
    </group>
  );
});

const Forklift = memo(function Forklift({ id }: { id: ID }) {
  const forklift = useWarehouseStore((s) => s.forklifts[id]);
  const selected = useWarehouseStore((s) => s.selection?.kind === 'forklift' && s.selection.id === id);
  const ref = useRef<THREE.Group>(null);
  useSmoothPose(ref, forklift.pose, 1.6, selected ? 3.2 : null);
  const { handlers, hovered } = usePick(() => useWarehouseStore.getState().select({ kind: 'forklift', id }));
  const carrying = forklift.status === 'loading' || forklift.status === 'unloading';

  return (
    <group ref={ref} {...handlers}>
      <mesh geometry={forkliftGeometry} material={vehicleMaterial} castShadow>
        <Highlight selected={selected} hovered={hovered} />
      </mesh>
      {carrying && <mesh geometry={forkliftLoadGeometry} material={vehicleMaterial} castShadow />}
      {selected && <SelectionMarker radius={2.2} />}
    </group>
  );
});

export function Trucks() {
  const ids = useWarehouseStore(useShallow((s) => Object.keys(s.trucks)));
  return ids.map((id) => <Truck key={id} id={id} />);
}

export function Forklifts() {
  const ids = useWarehouseStore(useShallow((s) => Object.keys(s.forklifts)));
  return ids.map((id) => <Forklift key={id} id={id} />);
}
