import { useEffect } from 'react';
import { useWarehouseStore } from '../store/useWarehouseStore';

const TICK_INTERVAL_MS = 2000;

/** Drives live updates: one simulation tick every 2 seconds while mounted. */
export function useSimulation() {
  useEffect(() => {
    const id = window.setInterval(() => useWarehouseStore.getState().tick(), TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);
}
