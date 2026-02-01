import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { AircraftType, AircraftAsset, FleetSummary } from '../types/aircraft';

// Demo aircraft data for when API is unavailable
const DEMO_AIRCRAFT: AircraftType[] = [
  // KRONOS Custom Platforms
  { id: 'STRIGOI', name: 'Ghost Strike UCAV', class: 'uav', uavType: 'ucav', manufacturerCode: 'KRONOS', isStealth: true, isSupersonic: true, isUnmanned: true, isCustom: true, maxSpeedMach: 1.8, ceilingKm: 15, rangeKm: 2500, enduranceHours: 8, maxG: 9, lengthM: 12.5, wingspanM: 10.2, mtowKg: 8500, roles: ['air_superiority', 'deep_strike', 'sead'] },
  { id: 'CORVUS', name: 'Raven ISR/Strike', class: 'uav', uavType: 'ucav', manufacturerCode: 'KRONOS', isStealth: true, isSupersonic: false, isUnmanned: true, isCustom: true, maxSpeedMach: 0.85, ceilingKm: 12, rangeKm: 3500, enduranceHours: 24, maxG: 6, lengthM: 14.0, wingspanM: 22.0, mtowKg: 6200, roles: ['isr', 'maritime_patrol', 'strike'] },
  { id: 'VULTUR', name: 'Eagle Eye HALE', class: 'uav', uavType: 'hale', manufacturerCode: 'KRONOS', isStealth: false, isSupersonic: false, isUnmanned: true, isCustom: true, maxSpeedMach: 0.6, ceilingKm: 20, rangeKm: 8000, enduranceHours: 36, maxG: 3, lengthM: 16.0, wingspanM: 35.0, mtowKg: 12000, roles: ['surveillance', 'sigint', 'relay'] },
  // NATO Fighters
  { id: 'F-35A', name: 'Lightning II', class: 'fighter', uavType: 'none', manufacturerCode: 'LMT', isStealth: true, isSupersonic: true, isUnmanned: false, isCustom: false, maxSpeedMach: 1.6, ceilingKm: 15.2, rangeKm: 2220, enduranceHours: null, maxG: 9, lengthM: 15.7, wingspanM: 10.7, mtowKg: 31800, roles: ['air_superiority', 'strike', 'sead'] },
  { id: 'F-16C', name: 'Fighting Falcon', class: 'fighter', uavType: 'none', manufacturerCode: 'LMT', isStealth: false, isSupersonic: true, isUnmanned: false, isCustom: false, maxSpeedMach: 2.0, ceilingKm: 15.2, rangeKm: 1760, enduranceHours: null, maxG: 9, lengthM: 15.0, wingspanM: 9.96, mtowKg: 21772, roles: ['air_superiority', 'strike'] },
  { id: 'F-22A', name: 'Raptor', class: 'fighter', uavType: 'none', manufacturerCode: 'LMT', isStealth: true, isSupersonic: true, isUnmanned: false, isCustom: false, maxSpeedMach: 2.25, ceilingKm: 19.8, rangeKm: 2960, enduranceHours: null, maxG: 9, lengthM: 18.9, wingspanM: 13.6, mtowKg: 38000, roles: ['air_superiority'] },
  { id: 'EUROFIGHTER', name: 'Typhoon', class: 'fighter', uavType: 'none', manufacturerCode: 'EADS', isStealth: false, isSupersonic: true, isUnmanned: false, isCustom: false, maxSpeedMach: 2.0, ceilingKm: 16.8, rangeKm: 2900, enduranceHours: null, maxG: 9, lengthM: 15.96, wingspanM: 10.95, mtowKg: 23500, roles: ['air_superiority', 'strike'] },
  { id: 'RAFALE', name: 'Rafale C', class: 'fighter', uavType: 'none', manufacturerCode: 'DAS', isStealth: false, isSupersonic: true, isUnmanned: false, isCustom: false, maxSpeedMach: 1.8, ceilingKm: 15.2, rangeKm: 3700, enduranceHours: null, maxG: 9, lengthM: 15.27, wingspanM: 10.8, mtowKg: 24500, roles: ['air_superiority', 'strike', 'nuclear'] },
  // Bombers
  { id: 'B-2A', name: 'Spirit', class: 'bomber', uavType: 'none', manufacturerCode: 'NOC', isStealth: true, isSupersonic: false, isUnmanned: false, isCustom: false, maxSpeedMach: 0.95, ceilingKm: 15.2, rangeKm: 11100, enduranceHours: null, maxG: 2, lengthM: 21.0, wingspanM: 52.4, mtowKg: 170600, roles: ['strategic_bomber', 'nuclear'] },
  { id: 'B-1B', name: 'Lancer', class: 'bomber', uavType: 'none', manufacturerCode: 'BOE', isStealth: false, isSupersonic: true, isUnmanned: false, isCustom: false, maxSpeedMach: 1.25, ceilingKm: 12.2, rangeKm: 9400, enduranceHours: null, maxG: 3, lengthM: 44.5, wingspanM: 41.8, mtowKg: 216400, roles: ['strategic_bomber', 'maritime_strike'] },
  // AEW
  { id: 'E-3', name: 'Sentry AWACS', class: 'aew', uavType: 'none', manufacturerCode: 'BOE', isStealth: false, isSupersonic: false, isUnmanned: false, isCustom: false, maxSpeedMach: 0.7, ceilingKm: 12.5, rangeKm: 7400, enduranceHours: 11, maxG: 2, lengthM: 46.6, wingspanM: 44.4, mtowKg: 147400, roles: ['awacs', 'battle_management'] },
  { id: 'E-7A', name: 'Wedgetail', class: 'aew', uavType: 'none', manufacturerCode: 'BOE', isStealth: false, isSupersonic: false, isUnmanned: false, isCustom: false, maxSpeedMach: 0.82, ceilingKm: 12.5, rangeKm: 7040, enduranceHours: 10, maxG: 2, lengthM: 33.6, wingspanM: 34.3, mtowKg: 77100, roles: ['awacs', 'battle_management'] },
  // ISR
  { id: 'MQ-9', name: 'Reaper', class: 'uav', uavType: 'male', manufacturerCode: 'GA', isStealth: false, isSupersonic: false, isUnmanned: true, isCustom: false, maxSpeedMach: 0.23, ceilingKm: 15.2, rangeKm: 1850, enduranceHours: 27, maxG: 3, lengthM: 11.0, wingspanM: 20.1, mtowKg: 4760, roles: ['isr', 'strike'] },
  { id: 'RQ-4', name: 'Global Hawk', class: 'uav', uavType: 'hale', manufacturerCode: 'NOC', isStealth: false, isSupersonic: false, isUnmanned: true, isCustom: false, maxSpeedMach: 0.57, ceilingKm: 18.3, rangeKm: 22780, enduranceHours: 32, maxG: 2, lengthM: 14.5, wingspanM: 39.9, mtowKg: 14628, roles: ['surveillance', 'sigint'] },
  // Tankers
  { id: 'KC-135', name: 'Stratotanker', class: 'tanker', uavType: 'none', manufacturerCode: 'BOE', isStealth: false, isSupersonic: false, isUnmanned: false, isCustom: false, maxSpeedMach: 0.86, ceilingKm: 15.2, rangeKm: 2400, enduranceHours: null, maxG: 2, lengthM: 41.5, wingspanM: 39.9, mtowKg: 146300, roles: ['aerial_refueling'] },
  { id: 'KC-46A', name: 'Pegasus', class: 'tanker', uavType: 'none', manufacturerCode: 'BOE', isStealth: false, isSupersonic: false, isUnmanned: false, isCustom: false, maxSpeedMach: 0.86, ceilingKm: 12.2, rangeKm: 12200, enduranceHours: null, maxG: 2, lengthM: 50.5, wingspanM: 48.1, mtowKg: 188240, roles: ['aerial_refueling', 'transport'] },
  // Transport
  { id: 'C-17', name: 'Globemaster III', class: 'transport', uavType: 'none', manufacturerCode: 'BOE', isStealth: false, isSupersonic: false, isUnmanned: false, isCustom: false, maxSpeedMach: 0.77, ceilingKm: 13.7, rangeKm: 4400, enduranceHours: null, maxG: 2, lengthM: 53.0, wingspanM: 51.7, mtowKg: 265350, roles: ['strategic_airlift'] },
  { id: 'C-130J', name: 'Super Hercules', class: 'transport', uavType: 'none', manufacturerCode: 'LMT', isStealth: false, isSupersonic: false, isUnmanned: false, isCustom: false, maxSpeedMach: 0.59, ceilingKm: 8.6, rangeKm: 3330, enduranceHours: null, maxG: 2, lengthM: 29.8, wingspanM: 40.4, mtowKg: 79380, roles: ['tactical_airlift', 'special_ops'] },
  // Helicopter
  { id: 'AH-64E', name: 'Apache Guardian', class: 'helicopter', uavType: 'none', manufacturerCode: 'BOE', isStealth: false, isSupersonic: false, isUnmanned: false, isCustom: false, maxSpeedMach: 0.23, ceilingKm: 6.4, rangeKm: 480, enduranceHours: 2.5, maxG: 3, lengthM: 17.7, wingspanM: null, mtowKg: 10400, roles: ['attack', 'anti_armor'] },
  { id: 'UH-60M', name: 'Black Hawk', class: 'helicopter', uavType: 'none', manufacturerCode: 'SIK', isStealth: false, isSupersonic: false, isUnmanned: false, isCustom: false, maxSpeedMach: 0.22, ceilingKm: 5.8, rangeKm: 590, enduranceHours: 2.3, maxG: 2, lengthM: 19.8, wingspanM: null, mtowKg: 10660, roles: ['utility', 'assault', 'medevac'] },
];

interface AssetState {
  aircraftTypes: AircraftType[];
  assets: AircraftAsset[];
  fleetSummary: FleetSummary[];
  selectedTypeId: string | null;
  isLoading: boolean;
  error: string | null;
  filter: {
    class: string | null;
    operator: string | null;
    status: string | null;
  };
}

interface AssetActions {
  fetchAircraftTypes: () => Promise<void>;
  fetchAssets: () => Promise<void>;
  fetchFleetSummary: () => Promise<void>;
  selectType: (typeId: string | null) => void;
  setFilter: (key: keyof AssetState['filter'], value: string | null) => void;
  clearFilters: () => void;
}

export const useAssetStore = create<AssetState & AssetActions>()(
  immer((set) => ({
    aircraftTypes: [],
    assets: [],
    fleetSummary: [],
    selectedTypeId: null,
    isLoading: false,
    error: null,
    filter: { class: null, operator: null, status: null },

    fetchAircraftTypes: async () => {
      set((s) => { s.isLoading = true; s.error = null; });
      try {
        const res = await fetch('/api/v1/aircraft/types');
        if (!res.ok) throw new Error('Failed to fetch aircraft types');
        const data = await res.json();
        set((s) => { s.aircraftTypes = data; s.isLoading = false; });
      } catch (_e) {
        // Fallback to demo data when API unavailable
        console.log('[ORBAT] Using demo aircraft data (API unavailable)');
        set((s) => { s.aircraftTypes = DEMO_AIRCRAFT; s.isLoading = false; s.error = null; });
      }
    },

    fetchAssets: async () => {
      set((s) => { s.isLoading = true; s.error = null; });
      try {
        const res = await fetch('/api/v1/aircraft/assets');
        if (!res.ok) throw new Error('Failed to fetch assets');
        const data = await res.json();
        set((s) => { s.assets = data; s.isLoading = false; });
      } catch (e) {
        set((s) => { s.error = (e as Error).message; s.isLoading = false; });
      }
    },

    fetchFleetSummary: async () => {
      set((s) => { s.isLoading = true; s.error = null; });
      try {
        const res = await fetch('/api/v1/aircraft/fleet');
        if (!res.ok) throw new Error('Failed to fetch fleet');
        const data = await res.json();
        set((s) => { s.fleetSummary = data; s.isLoading = false; });
      } catch (e) {
        set((s) => { s.error = (e as Error).message; s.isLoading = false; });
      }
    },

    selectType: (typeId) => set((s) => { s.selectedTypeId = typeId; }),

    setFilter: (key, value) => set((s) => { s.filter[key] = value; }),

    clearFilters: () => set((s) => {
      s.filter = { class: null, operator: null, status: null };
    }),
  }))
);
