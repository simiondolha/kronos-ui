import { type FC, useState, useEffect } from "react";
import { motion } from "framer-motion";

type SensorType = "AESA" | "IRST" | "ESM" | "FUSED";
type TrackStatus = "FIRM" | "TENTATIVE" | "LOST";

interface Track {
  id: string;
  sensor: SensorType;
  classification: string;
  confidence: number;
  range: number;
  bearing: number;
  altitude: number;
  status: TrackStatus;
}

interface SensorStatus {
  type: SensorType;
  active: boolean;
  tracksCount: number;
  health: number;
}

const INITIAL_SENSORS: SensorStatus[] = [
  { type: "AESA", active: true, tracksCount: 3, health: 98 },
  { type: "IRST", active: true, tracksCount: 2, health: 100 },
  { type: "ESM", active: true, tracksCount: 1, health: 95 },
  { type: "FUSED", active: true, tracksCount: 4, health: 100 },
];

/**
 * PerceptionPanel - Shows sensor fusion and track management
 * Displays AESA, IRST, ESM sensor status and fused tracks
 */
export const PerceptionPanel: FC = () => {
  const [sensors, setSensors] = useState<SensorStatus[]>(INITIAL_SENSORS);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [detectionRate, setDetectionRate] = useState(0);

  // Simulate track updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update sensors
      setSensors((prev) =>
        prev.map((s) => ({
          ...s,
          tracksCount: Math.max(0, s.tracksCount + Math.floor(Math.random() * 3) - 1),
          health: Math.min(100, Math.max(85, s.health + (Math.random() - 0.5) * 2)),
        }))
      );

      // Generate tracks
      const trackCount = Math.floor(Math.random() * 4) + 2;
      const sensorTypes: SensorType[] = ["AESA", "IRST", "ESM", "FUSED"];
      const classifications = ["HOSTILE", "UNKNOWN", "FRIENDLY"];
      const statuses: TrackStatus[] = ["FIRM", "TENTATIVE"];

      const newTracks: Track[] = Array.from({ length: trackCount }, (_, i) => ({
        id: `TGT-${String(i + 1).padStart(3, "0")}`,
        sensor: sensorTypes[Math.floor(Math.random() * sensorTypes.length)]!,
        classification: classifications[Math.floor(Math.random() * classifications.length)]!,
        confidence: Math.random() * 40 + 60,
        range: Math.random() * 50 + 10,
        bearing: Math.random() * 360,
        altitude: Math.random() * 30000 + 5000,
        status: statuses[Math.floor(Math.random() * statuses.length)]!,
      }));

      setTracks(newTracks);
      setDetectionRate(Math.random() * 20 + 80);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="perception-panel">
      <header className="perception-panel__header">
        <span className="perception-panel__title">PERCEPTION</span>
        <span className="perception-panel__rate">{detectionRate.toFixed(0)}% Det</span>
      </header>

      <div className="perception-panel__sensors">
        {sensors.map((sensor) => (
          <div key={sensor.type} className={`sensor-card ${!sensor.active ? "sensor-card--inactive" : ""}`}>
            <div className="sensor-card__type">{sensor.type}</div>
            <div className="sensor-card__tracks">{sensor.tracksCount} tracks</div>
            <div className="sensor-card__health">
              <div className="sensor-card__health-bar" style={{ width: `${sensor.health}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="perception-panel__pipeline">
        <div className="pipeline-stage">
          <span className="pipeline-stage__icon">◉</span>
          <span className="pipeline-stage__label">RAW</span>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className="pipeline-stage">
          <span className="pipeline-stage__icon">◎</span>
          <span className="pipeline-stage__label">DETECT</span>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className="pipeline-stage">
          <span className="pipeline-stage__icon">⊕</span>
          <span className="pipeline-stage__label">FUSE</span>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className="pipeline-stage">
          <span className="pipeline-stage__icon">◈</span>
          <span className="pipeline-stage__label">TRACK</span>
        </div>
      </div>

      <div className="perception-panel__tracks">
        <div className="tracks-header">
          <span>ID</span>
          <span>SENSOR</span>
          <span>CLASS</span>
          <span>CONF</span>
          <span>STATUS</span>
        </div>
        {tracks.map((track) => (
          <motion.div
            key={track.id}
            className="track-row"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <span className="track-row__id">{track.id}</span>
            <span className="track-row__sensor">{track.sensor}</span>
            <span className={`track-row__class track-row__class--${track.classification.toLowerCase()}`}>
              {track.classification}
            </span>
            <span className="track-row__conf">
              <div className="conf-bar" style={{ width: `${track.confidence}%` }} />
              {track.confidence.toFixed(0)}%
            </span>
            <span className={`track-row__status track-row__status--${track.status.toLowerCase()}`}>
              {track.status}
            </span>
          </motion.div>
        ))}
      </div>

      <style>{STYLES}</style>
    </div>
  );
};

const STYLES = `
.perception-panel {
  background: rgba(18, 22, 28, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 209, 255, 0.2);
  border-radius: 8px;
  padding: 16px;
  font-family: var(--font-family-mono);
  font-size: 11px;
  min-width: 380px;
}

.perception-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 209, 255, 0.15);
}

.perception-panel__title {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-accent, #00D1FF);
  letter-spacing: 0.1em;
}

.perception-panel__rate {
  font-size: 10px;
  color: var(--color-friendly, #00E676);
  font-weight: 600;
}

.perception-panel__sensors {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.sensor-card {
  padding: 10px 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  text-align: center;
}

.sensor-card--inactive {
  opacity: 0.4;
}

.sensor-card__type {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-accent, #00D1FF);
  margin-bottom: 4px;
}

.sensor-card__tracks {
  font-size: 9px;
  color: var(--text-muted, #666);
  margin-bottom: 6px;
}

.sensor-card__health {
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.sensor-card__health-bar {
  height: 100%;
  background: var(--color-friendly, #00E676);
  transition: width 0.3s ease;
}

.perception-panel__pipeline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  margin-bottom: 16px;
}

.pipeline-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.pipeline-stage__icon {
  font-size: 16px;
}

.pipeline-stage__label {
  font-size: 9px;
  font-weight: 600;
  color: var(--text-muted, #666);
}

.pipeline-arrow {
  color: var(--color-accent, #00D1FF);
  font-size: 14px;
}

.perception-panel__tracks {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.tracks-header {
  display: grid;
  grid-template-columns: 70px 60px 80px 80px 70px;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  font-size: 9px;
  font-weight: 700;
  color: var(--text-muted, #666);
  text-transform: uppercase;
}

.track-row {
  display: grid;
  grid-template-columns: 70px 60px 80px 80px 70px;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.track-row__id {
  font-weight: 600;
  color: var(--text-primary, #fff);
}

.track-row__sensor {
  color: var(--color-accent, #00D1FF);
  font-size: 10px;
}

.track-row__class {
  font-weight: 600;
  font-size: 10px;
}

.track-row__class--hostile { color: var(--color-hostile, #FF4444); }
.track-row__class--unknown { color: var(--color-warning, #FFAB00); }
.track-row__class--friendly { color: var(--color-friendly, #00E676); }

.track-row__conf {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--text-muted, #666);
}

.conf-bar {
  height: 4px;
  background: var(--color-accent, #00D1FF);
  border-radius: 2px;
  flex-shrink: 0;
  width: 30px;
}

.track-row__status {
  font-size: 9px;
  font-weight: 600;
}

.track-row__status--firm { color: var(--color-friendly, #00E676); }
.track-row__status--tentative { color: var(--color-warning, #FFAB00); }
.track-row__status--lost { color: var(--color-hostile, #FF4444); }
`;
