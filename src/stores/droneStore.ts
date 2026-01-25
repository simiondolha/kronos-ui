import { create } from 'zustand';
import { enableMapSet } from 'immer';
import { immer } from 'zustand/middleware/immer';
import type { DroneState, TelemetryHistory } from '../types/drone';

// Enable Immer Map/Set support
enableMapSet();

const HISTORY_DURATION_MS = 60_000;
const HISTORY_MAX_POINTS = 600;

interface DroneStore {
  drones: Map<string, DroneState>;
  history: Map<string, TelemetryHistory>;
  selectedId: string | null;
  updateDrone: (drone: DroneState) => void;
  removeDrone: (id: string) => void;
  selectDrone: (id: string | null) => void;
}

export const useDroneStore = create<DroneStore>()(
  immer((set) => ({
    drones: new Map(),
    history: new Map(),
    selectedId: null,

    updateDrone: (drone: DroneState) => {
      set((state) => {
        state.drones.set(drone.id, drone);

        let hist = state.history.get(drone.id);
        if (!hist) {
          hist = { altitude: [], speed: [], timestamps: [] };
          state.history.set(drone.id, hist);
        }

        hist.altitude.push(drone.position.alt);
        hist.speed.push(drone.velocity.speed);
        hist.timestamps.push(drone.timestamp);

        // Trim old entries
        const cutoff = Date.now() - HISTORY_DURATION_MS;
        while (hist.timestamps.length > 0 && (hist.timestamps[0] ?? Infinity) < cutoff) {
          hist.altitude.shift();
          hist.speed.shift();
          hist.timestamps.shift();
        }

        // Cap max points
        if (hist.timestamps.length > HISTORY_MAX_POINTS) {
          const excess = hist.timestamps.length - HISTORY_MAX_POINTS;
          hist.altitude.splice(0, excess);
          hist.speed.splice(0, excess);
          hist.timestamps.splice(0, excess);
        }
      });
    },

    removeDrone: (id: string) => {
      set((state) => {
        state.drones.delete(id);
        state.history.delete(id);
        if (state.selectedId === id) {
          state.selectedId = null;
        }
      });
    },

    selectDrone: (id: string | null) => {
      set((state) => {
        state.selectedId = id;
      });
    },
  }))
);
