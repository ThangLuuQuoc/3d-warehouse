import * as THREE from 'three';

/**
 * Bridge between 3D positions and HTML labels rendered in the normal React
 * tree (outside the Canvas). The scene writes world-space anchors; once per
 * frame the projector moves the bound DOM elements with a CSS transform.
 * This avoids drei <Html>, which mounts a separate React root per label.
 */

export const SELECTION_LABEL = 'selection';
export const siteLabelId = (siteId: string) => `site:${siteId}`;

const anchors = new Map<string, THREE.Vector3>();
const elements = new Map<string, HTMLElement>();
/** Last transform written per element, to skip redundant style writes. */
const written = new Map<string, string>();
const v = new THREE.Vector3();

export function setLabelAnchor(id: string, x: number, y: number, z: number) {
  const p = anchors.get(id);
  if (p) p.set(x, y, z);
  else anchors.set(id, new THREE.Vector3(x, y, z));
}

export function clearLabelAnchor(id: string) {
  anchors.delete(id);
}

/** Ref callback target for label elements. */
export function bindLabelElement(id: string, el: HTMLElement | null) {
  written.delete(id);
  if (el) {
    el.style.visibility = 'hidden';
    elements.set(id, el);
  } else {
    elements.delete(id);
  }
}

export function projectLabels(camera: THREE.Camera, width: number, height: number) {
  elements.forEach((el, id) => {
    const p = anchors.get(id);
    let next = 'hidden';
    if (p) {
      v.copy(p).project(camera);
      if (Math.abs(v.x) <= 1.1 && Math.abs(v.y) <= 1.1 && v.z <= 1) {
        next = `translate3d(${Math.round(((v.x + 1) / 2) * width)}px, ${Math.round(((1 - v.y) / 2) * height)}px, 0) translate(-50%, -100%)`;
      }
    }
    if (written.get(id) === next) return;
    written.set(id, next);
    if (next === 'hidden') {
      el.style.visibility = 'hidden';
    } else {
      el.style.visibility = 'visible';
      el.style.transform = next;
    }
  });
}
