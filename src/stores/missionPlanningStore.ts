import { create } from "zustand";

export interface PlannedWaypoint {
  lat: number;
  lon: number;
  alt_m: number;
  speed_mps?: number;
}

interface MissionPlanningState {
  waypoints: PlannedWaypoint[];
  drawMode: boolean;
  setDrawMode: (enabled: boolean) => void;
  addWaypoint: (wp: PlannedWaypoint) => void;
  removeWaypoint: (index: number) => void;
  clearWaypoints: () => void;
  updateWaypoint: (index: number, wp: Partial<PlannedWaypoint>) => void;
}

export const useMissionPlanningStore = create<MissionPlanningState>((set, get) => ({
  waypoints: [],
  drawMode: false,

  setDrawMode: (enabled) => set({ drawMode: enabled }),

  addWaypoint: (wp) =>
    set((state) => ({
      waypoints: [...state.waypoints, wp],
    })),

  removeWaypoint: (index) =>
    set((state) => ({
      waypoints: state.waypoints.filter((_, i) => i !== index),
    })),

  clearWaypoints: () => set({ waypoints: [] }),

  updateWaypoint: (index, wp) => {
    const existing = get().waypoints;
    if (!existing[index]) return;
    set({
      waypoints: existing.map((item, i) => (i === index ? { ...item, ...wp } : item)),
    });
  },
}));
