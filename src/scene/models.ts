import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { carrierColor } from './theme';

/**
 * Low-poly vehicle models. Each model is one merged, vertex-coloured geometry,
 * so a whole truck or forklift is a single draw call. Models face +X and sit
 * on y = 0.
 */

const tmpColor = new THREE.Color();

function paint(geo: THREE.BufferGeometry, color: string) {
  tmpColor.set(color); // hex is sRGB; Color stores it in the linear working space
  const count = geo.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) tmpColor.toArray(colors, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
  paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), color);

const wheel = (radius: number, width: number, x: number, y: number, z: number, color = '#15171a') =>
  paint(new THREE.CylinderGeometry(radius, radius, width, 10).rotateX(Math.PI / 2).translate(x, y, z), color);

const merge = (parts: THREE.BufferGeometry[]) => {
  const geo = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  geo.computeBoundingSphere();
  return geo;
};

function buildTruck(accent: string) {
  const parts = [
    box(10.2, 0.45, 2.1, 0, 0.8, 0, '#1c1f24'), // chassis
    box(7.6, 3.0, 2.5, -1.3, 2.55, 0, '#c9ced6'), // trailer
    box(7.62, 0.55, 2.52, -1.3, 3.4, 0, accent), // carrier stripe
    box(0.08, 2.6, 2.3, -5.12, 2.5, 0, '#9aa1ab'), // rear doors
    box(2.4, 2.6, 2.4, 3.9, 2.15, 0, accent), // cab
    box(2.0, 0.5, 2.3, 3.7, 3.6, 0, accent), // cab roof fairing
    box(0.08, 0.95, 2.05, 5.12, 2.75, 0, '#0d1520'), // windshield
    box(0.12, 0.35, 2.2, 5.14, 1.25, 0, '#2a2e35'), // bumper
  ];
  for (const x of [-4.3, -3.3, 1.2, 4.1]) {
    for (const z of [-1.05, 1.05]) parts.push(wheel(0.5, 0.42, x, 0.5, z));
  }
  return merge(parts);
}

const truckCache = new Map<string, THREE.BufferGeometry>();
/** One geometry per carrier livery, built on first use and shared by every truck of that carrier. */
export function truckGeometry(carrier: string) {
  let geo = truckCache.get(carrier);
  if (!geo) {
    geo = buildTruck(carrierColor(carrier));
    truckCache.set(carrier, geo);
  }
  return geo;
}

export const forkliftGeometry = merge([
  box(1.7, 0.7, 1.15, -0.1, 0.65, 0, '#f5a524'), // body
  box(0.55, 0.85, 1.15, -0.95, 0.85, 0, '#2a2e35'), // counterweight
  box(0.5, 0.35, 0.5, -0.25, 1.15, 0, '#1c1f24'), // seat
  box(0.07, 1.3, 0.07, 0.45, 1.65, 0.5, '#2a2e35'), // overhead guard posts
  box(0.07, 1.3, 0.07, 0.45, 1.65, -0.5, '#2a2e35'),
  box(0.07, 1.3, 0.07, -0.65, 1.65, 0.5, '#2a2e35'),
  box(0.07, 1.3, 0.07, -0.65, 1.65, -0.5, '#2a2e35'),
  box(1.25, 0.07, 1.15, -0.1, 2.32, 0, '#2a2e35'), // guard roof
  box(0.14, 2.6, 0.9, 0.85, 1.4, 0, '#3a3f47'), // mast
  box(0.9, 0.06, 0.14, 1.35, 0.15, 0.3, '#8a9099'), // forks
  box(0.9, 0.06, 0.14, 1.35, 0.15, -0.3, '#8a9099'),
  wheel(0.3, 0.25, 0.45, 0.3, 0.5),
  wheel(0.3, 0.25, 0.45, 0.3, -0.5),
  wheel(0.26, 0.25, -0.75, 0.26, 0.5),
  wheel(0.26, 0.25, -0.75, 0.26, -0.5),
]);

/** Pallet load carried on the forks while working. */
export const forkliftLoadGeometry = merge([
  box(1.0, 0.12, 0.9, 1.35, 0.25, 0, '#7a5c3a'),
  box(0.95, 0.75, 0.85, 1.35, 0.7, 0, '#b48a5a'),
]);

export const vehicleMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.1 });

/** Unit box shared by every instanced box in the scene; instances scale it. */
export const unitBox = new THREE.BoxGeometry(1, 1, 1);
