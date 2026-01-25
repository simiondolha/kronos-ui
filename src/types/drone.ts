export interface Position3D {
  lat: number;
  lon: number;
  alt_m: number;
  // Alias for compatibility
  alt: number;
  heading: number;
}

export interface Velocity {
  speed: number;
  vx?: number;
  vy?: number;
  vz?: number;
}

export type PlatformType = 'Strigoi' | 'Corvus' | 'Vultur';

export type GPSFixType = 'NO_FIX' | 'FIX_2D' | 'FIX_3D' | 'DGPS' | 'RTK_FLOAT' | 'RTK_FIXED';

export interface DroneState {
  id: string;           // Primary identifier
  entity_id: string;    // Alias for swarm compatibility
  callsign: string;
  platform_type: PlatformType;
  position: Position3D;
  velocity: Velocity;
  heading: number;
  speed_mps: number;
  fuel_percent: number;
  battery: number;
  mode: string;
  armed: boolean;
  gpsFixType: GPSFixType;
  gpsSatellites: number;
  timestamp: number;
}

export interface TelemetryHistory {
  altitude: number[];
  speed: number[];
  timestamps: number[];
}

export type FormationType = 'line' | 'wedge' | 'orbit' | 'scatter' | 'diamond';

export interface SwarmMember {
  drone_id: string;
  role: 'leader' | 'follower';
}

export interface SwarmState {
  swarm_id: string;
  formation_type: FormationType;
  formation_active: boolean;
  leader_id: string;
  members: SwarmMember[];
}
