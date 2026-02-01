// Aircraft types matching database schema

export type AircraftClass = 'fighter' | 'bomber' | 'transport' | 'tanker' | 'aew' | 'isr' | 'helicopter' | 'uav';
export type UavType = 'ucav' | 'male' | 'hale' | 'tactical' | 'none';
export type AssetStatus = 'operational' | 'maintenance' | 'storage' | 'retired';

export interface AircraftType {
  id: string;                    // "F-35A", "STRIGOI"
  name: string;                  // "Lightning II"
  class: AircraftClass;
  uavType: UavType;
  manufacturerCode: string;
  isStealth: boolean;
  isSupersonic: boolean;
  isUnmanned: boolean;
  isCustom: boolean;
  maxSpeedMach: number | null;
  ceilingKm: number | null;
  rangeKm: number | null;
  enduranceHours: number | null;
  maxG: number | null;
  lengthM: number | null;
  wingspanM: number | null;
  mtowKg: number | null;
  roles: string[];
}

export interface AircraftAsset {
  id: string;
  typeId: string;
  serial: string;
  tailNumber: string | null;
  callsign: string | null;
  operatorCode: string;
  unit: string | null;
  baseIcao: string | null;
  status: AssetStatus;
  flightHours: number;
}

export interface AssetPosition {
  assetId: string;
  lat: number;
  lon: number;
  altM: number;
  heading: number;
  speedKts: number;
  fuelPct: number;
  updatedAt: string;
}

export interface FleetSummary {
  operatorCode: string;
  type: string;
  name: string;
  class: AircraftClass;
  total: number;
  operational: number;
}
