# WareTrack

A 3D warehouse management dashboard that plays like a real-time strategy game. Three warehouse sites, their docks, trucks, forklifts and pallet racks are drawn procedurally with React Three Fiber, and a simulation updates them live every 2 seconds.

Concept reference screenshots are in [`ui/`](ui/).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tsc --noEmit
npm run build      # production bundle in dist/
```

## Controls

- **Drag** to pan, **wheel** to zoom (towards the cursor). The camera cannot leave the map.
- **Click** any truck, forklift, dock, rack, pallet or building to inspect it. Click empty ground to clear.
- **Site selector** (top bar) glides the camera to another warehouse; KPIs follow the active site.
- **Filters**: "Delayed only" shipments, or trucks of one status. Both apply to the 3D scene and the lists.
- **Camera presets** (bottom left): Overview, Dock bays, High racks, Reset view.

## Architecture

| Folder | Role |
| --- | --- |
| `src/data/` | Domain types (`types.ts`), seed data (`seed.ts`: 3 sites, 18 docks, 12 trucks, 8 forklifts, 40 items, 25 shipments) and the shared site floor plan (`layout.ts`). |
| `src/sim/` | Pure `simulateTick(world, rng)` (truck and forklift state machines, stock movements) and the 2-second driver hook. |
| `src/store/` | Zustand store (world + UI state + actions) and `selectors.ts`, which holds every business rule: delayed, low stock, KPIs, filters. |
| `src/scene/` | The 3D view. Reads the store, reports clicks, holds no business logic. Static and repeated geometry is instanced; each vehicle is one merged, vertex-coloured mesh. |
| `src/ui/` | HTML overlay: top bar, KPI cards, filters, inspector, shipments, fleet, camera presets, and labels pinned to 3D positions. |

Relations are stored once, by ID: `Truck.dockId` owns dock occupancy, `Shipment.truckId` owns a truck's current job, and reverse lookups are derived in selectors.
