import { create } from 'zustand';
import type { DroneState, SwarmState } from '../types/drone';

interface SwarmStore {
  drones: Map<string, DroneState>;
  swarm: SwarmState | null;
  setDrone: (drone: DroneState) => void;
  setSwarm: (swarm: SwarmState | null) => void;
  getSwarmDrones: () => DroneState[];
}

export const useSwarmStore = create<SwarmStore>((set, get) => ({
  drones: new Map(),
  swarm: null,

  setDrone: (drone) =>
    set((state) => {
      const drones = new Map(state.drones);
      drones.set(drone.entity_id, drone);
      return { drones };
    }),

  setSwarm: (swarm) => set({ swarm }),

  getSwarmDrones: () => {
    const { drones, swarm } = get();
    if (!swarm) return [];
    return swarm.members
      .map((m) => drones.get(m.drone_id))
      .filter((d): d is DroneState => d !== undefined);
  },
}));
