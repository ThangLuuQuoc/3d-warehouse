import { MapControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { MapControls as MapControlsImpl } from 'three-stdlib';
import { MAP_BOUNDS } from '../data/layout';
import { useWarehouseStore } from '../store/useWarehouseStore';
import { CAMERA_OFFSET } from './camera';

const MIN_ZOOM = 3.5;
const MAX_ZOOM = 38;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Strategy-game camera: drag to pan, wheel to zoom, no rotation. The look-at
 * target is clamped to MAP_BOUNDS so the player cannot leave the map, and the
 * camera glides to any focus point the store requests.
 */
export function CameraRig() {
  const controls = useRef<MapControlsImpl>(null);
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const focus = useWarehouseStore((s) => s.cameraFocus);
  const goal = useRef<{ x: number; z: number; zoom: number | null } | null>(null);
  const [initialTarget] = useState<[number, number, number]>(() => [focus.x, 0, focus.z]);

  useEffect(() => {
    goal.current = { x: focus.x, z: focus.z, zoom: focus.zoom };
  }, [focus]);

  const keepInBounds = () => {
    const c = controls.current;
    if (!c) return;
    const t = c.target;
    t.set(clamp(t.x, MAP_BOUNDS.minX, MAP_BOUNDS.maxX), 0, clamp(t.z, MAP_BOUNDS.minZ, MAP_BOUNDS.maxZ));
    camera.position.copy(t).add(CAMERA_OFFSET);
  };

  useFrame((_, dt) => {
    const c = controls.current;
    const g = goal.current;
    if (!c || !g) return;
    const k = 1 - Math.exp(-dt * 4);
    c.target.x += (g.x - c.target.x) * k;
    c.target.z += (g.z - c.target.z) * k;
    let zoomDone = true;
    if (g.zoom !== null) {
      camera.zoom += (g.zoom - camera.zoom) * k;
      camera.updateProjectionMatrix();
      zoomDone = Math.abs(g.zoom - camera.zoom) < 0.01;
    }
    keepInBounds();
    c.update();
    if (zoomDone && Math.abs(g.x - c.target.x) + Math.abs(g.z - c.target.z) < 0.02) goal.current = null;
  });

  return (
    <MapControls
      ref={controls}
      makeDefault
      target={initialTarget}
      enableRotate={false}
      screenSpacePanning={false}
      zoomToCursor
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      dampingFactor={0.12}
      onStart={() => (goal.current = null)} // user input cancels a camera glide
      onChange={keepInBounds}
    />
  );
}

/**
 * Key light that follows the camera target, with a shadow frustum sized to
 * what is on screen (keeps shadows crisp without a huge shadow map), plus a
 * shadowless fill from the camera side so walls facing the viewer read clearly.
 */
export function SunLight() {
  const light = useRef<THREE.DirectionalLight>(null!);
  const fill = useRef<THREE.DirectionalLight>(null!);
  const controls = useThree((s) => s.controls) as MapControlsImpl | null;
  const lastExtent = useRef(0);

  useFrame(({ camera, size }) => {
    const l = light.current;
    const t = controls?.target;
    if (!t) return;
    l.position.set(t.x + 45, 80, t.z + 35);
    l.target.position.set(t.x, 0, t.z);
    l.target.updateMatrixWorld();
    fill.current.position.copy(t).add(CAMERA_OFFSET);
    fill.current.target.position.copy(t);
    fill.current.target.updateMatrixWorld();

    const zoom = (camera as THREE.OrthographicCamera).zoom;
    const extent = clamp((Math.max(size.width, size.height) / zoom) * 0.62, 30, 170);
    if (Math.abs(extent - lastExtent.current) > lastExtent.current * 0.08) {
      const cam = l.shadow.camera;
      cam.left = cam.bottom = -extent;
      cam.right = cam.top = extent;
      cam.updateProjectionMatrix();
      lastExtent.current = extent;
    }
  });

  return (
    <>
      <directionalLight ref={fill} color="#d6e2f0" intensity={1.1} />
      <directionalLight
        ref={light}
        color="#fff1dc"
        intensity={3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-near={1}
        shadow-camera-far={260}
      />
    </>
  );
}
