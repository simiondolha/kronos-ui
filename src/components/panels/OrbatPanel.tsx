import React, { useEffect, useMemo, useState } from 'react';
import { useAssetStore } from '../../stores/assetStore';
import type { AircraftType, AircraftClass } from '../../types/aircraft';

const CLASS_LABELS: Record<AircraftClass, string> = {
  fighter: 'FIGHTERS',
  bomber: 'BOMBERS',
  transport: 'TRANSPORT',
  tanker: 'TANKERS',
  aew: 'AEW/C2',
  isr: 'ISR',
  helicopter: 'ROTARY',
  uav: 'UAV/UCAV',
};

const CLASS_ORDER: AircraftClass[] = ['fighter', 'bomber', 'uav', 'aew', 'isr', 'tanker', 'transport', 'helicopter'];

interface AircraftCardProps {
  aircraft: AircraftType;
  isSelected: boolean;
  onClick: () => void;
}

const AircraftCard: React.FC<AircraftCardProps> = ({ aircraft, isSelected, onClick }) => (
  <div
    className={`orbat-card ${isSelected ? 'orbat-card--selected' : ''}`}
    onClick={onClick}
  >
    <div className="orbat-card__header">
      <span className="orbat-card__designation">{aircraft.id}</span>
      {aircraft.isCustom && <span className="orbat-badge orbat-badge--kronos">KRONOS</span>}
      {aircraft.isStealth && <span className="orbat-badge orbat-badge--stealth">STEALTH</span>}
      {aircraft.isUnmanned && <span className="orbat-badge orbat-badge--uav">UAV</span>}
    </div>
    <div className="orbat-card__name">{aircraft.name}</div>
    <div className="orbat-card__stats">
      {aircraft.maxSpeedMach && <span>M{aircraft.maxSpeedMach.toFixed(2)}</span>}
      {aircraft.ceilingKm && <span>{aircraft.ceilingKm}km</span>}
      {aircraft.enduranceHours && <span>{aircraft.enduranceHours}h</span>}
      {aircraft.maxG && <span>{aircraft.maxG}G</span>}
    </div>
    <div className="orbat-card__roles">
      {aircraft.roles.slice(0, 3).map((r) => (
        <span key={r} className="orbat-role">{r.replace('_', ' ')}</span>
      ))}
    </div>
  </div>
);

interface DetailPanelProps {
  aircraft: AircraftType;
  onClose: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ aircraft, onClose }) => (
  <div className="orbat-detail">
    <div className="orbat-detail__header">
      <div>
        <h2 className="orbat-detail__id">{aircraft.id}</h2>
        <span className="orbat-detail__name">{aircraft.name}</span>
      </div>
      <button className="orbat-detail__close" onClick={onClose}>X</button>
    </div>

    <div className="orbat-detail__badges">
      {aircraft.isCustom && <span className="orbat-badge orbat-badge--kronos">KRONOS PLATFORM</span>}
      {aircraft.isStealth && <span className="orbat-badge orbat-badge--stealth">LOW OBSERVABLE</span>}
      {aircraft.isSupersonic && <span className="orbat-badge orbat-badge--supersonic">SUPERSONIC</span>}
      {aircraft.isUnmanned && <span className="orbat-badge orbat-badge--uav">UNMANNED</span>}
    </div>

    <div className="orbat-detail__section">
      <h3>PERFORMANCE</h3>
      <div className="orbat-detail__grid">
        <div className="orbat-stat">
          <label>MAX SPEED</label>
          <span>{aircraft.maxSpeedMach ? `Mach ${aircraft.maxSpeedMach}` : '-'}</span>
        </div>
        <div className="orbat-stat">
          <label>CEILING</label>
          <span>{aircraft.ceilingKm ? `${aircraft.ceilingKm} km` : '-'}</span>
        </div>
        <div className="orbat-stat">
          <label>RANGE</label>
          <span>{aircraft.rangeKm ? `${aircraft.rangeKm} km` : '-'}</span>
        </div>
        <div className="orbat-stat">
          <label>ENDURANCE</label>
          <span>{aircraft.enduranceHours ? `${aircraft.enduranceHours} hrs` : '-'}</span>
        </div>
        <div className="orbat-stat">
          <label>MAX G</label>
          <span>{aircraft.maxG ? `+${aircraft.maxG}G` : '-'}</span>
        </div>
        <div className="orbat-stat">
          <label>MTOW</label>
          <span>{aircraft.mtowKg ? `${(aircraft.mtowKg / 1000).toFixed(1)}t` : '-'}</span>
        </div>
      </div>
    </div>

    <div className="orbat-detail__section">
      <h3>DIMENSIONS</h3>
      <div className="orbat-detail__grid">
        <div className="orbat-stat">
          <label>LENGTH</label>
          <span>{aircraft.lengthM ? `${aircraft.lengthM}m` : '-'}</span>
        </div>
        <div className="orbat-stat">
          <label>WINGSPAN</label>
          <span>{aircraft.wingspanM ? `${aircraft.wingspanM}m` : '-'}</span>
        </div>
      </div>
    </div>

    <div className="orbat-detail__section">
      <h3>MISSION ROLES</h3>
      <div className="orbat-detail__roles">
        {aircraft.roles.map((r) => (
          <span key={r} className="orbat-role-tag">{r.replace(/_/g, ' ').toUpperCase()}</span>
        ))}
      </div>
    </div>
  </div>
);

interface OrbatPanelProps {
  onClose?: () => void;
}

export const OrbatPanel: React.FC<OrbatPanelProps> = ({ onClose }) => {
  const { aircraftTypes, selectedTypeId, isLoading, error, filter, fetchAircraftTypes, selectType, setFilter, clearFilters } = useAssetStore();
  const [showFullOrbat, setShowFullOrbat] = useState(false);

  useEffect(() => {
    fetchAircraftTypes();
  }, [fetchAircraftTypes]);

  const { kronosAircraft, natoAircraft, groupedAircraft } = useMemo(() => {
    let filtered = aircraftTypes;
    if (filter.class) filtered = filtered.filter((a) => a.class === filter.class);

    const kronos = filtered.filter((a) => a.isCustom);
    const nato = filtered.filter((a) => !a.isCustom);

    const groups: Record<AircraftClass, AircraftType[]> = {
      fighter: [], bomber: [], transport: [], tanker: [], aew: [], isr: [], helicopter: [], uav: [],
    };
    nato.forEach((a) => groups[a.class]?.push(a));
    return { kronosAircraft: kronos, natoAircraft: nato, groupedAircraft: groups };
  }, [aircraftTypes, filter]);

  const selectedAircraft = useMemo(
    () => aircraftTypes.find((a) => a.id === selectedTypeId) || null,
    [aircraftTypes, selectedTypeId]
  );

  const stats = useMemo(() => ({
    total: aircraftTypes.length,
    stealth: aircraftTypes.filter((a) => a.isStealth).length,
    unmanned: aircraftTypes.filter((a) => a.isUnmanned).length,
    kronos: aircraftTypes.filter((a) => a.isCustom).length,
  }), [aircraftTypes]);

  return (
    <div className="orbat-panel">
      <div className="orbat-panel__header">
        <div>
          <h1>ORBAT</h1>
          <span className="orbat-panel__subtitle">ORDER OF BATTLE - FORCE STRUCTURE</span>
        </div>
        {onClose && (
          <button className="orbat-panel__close" onClick={onClose}>X</button>
        )}
      </div>

      <div className="orbat-panel__stats">
        <div className="orbat-stat-box">
          <span className="orbat-stat-box__value">{stats.total}</span>
          <span className="orbat-stat-box__label">TYPES</span>
        </div>
        <div className="orbat-stat-box">
          <span className="orbat-stat-box__value">{stats.stealth}</span>
          <span className="orbat-stat-box__label">STEALTH</span>
        </div>
        <div className="orbat-stat-box">
          <span className="orbat-stat-box__value">{stats.unmanned}</span>
          <span className="orbat-stat-box__label">UAV</span>
        </div>
        <div className="orbat-stat-box orbat-stat-box--accent">
          <span className="orbat-stat-box__value">{stats.kronos}</span>
          <span className="orbat-stat-box__label">KRONOS</span>
        </div>
      </div>

      <div className="orbat-panel__filters">
        <select
          value={filter.class || ''}
          onChange={(e) => setFilter('class', e.target.value || null)}
        >
          <option value="">All Classes</option>
          {CLASS_ORDER.map((c) => <option key={c} value={c}>{CLASS_LABELS[c]}</option>)}
        </select>
        {filter.class && <button className="orbat-clear-btn" onClick={clearFilters}>Clear</button>}
        {natoAircraft.length > 0 && (
          <button
            className="orbat-toggle-btn"
            onClick={() => setShowFullOrbat((v) => !v)}
          >
            {showFullOrbat ? "Hide NATO Fleet" : "Show NATO Fleet"}
          </button>
        )}
      </div>

      {isLoading && <div className="orbat-loading">LOADING FORCE DATA...</div>}
      {error && <div className="orbat-error">{error}</div>}

      <div className="orbat-panel__content">
        <div className="orbat-grid">
          {kronosAircraft.length > 0 && (
            <div className="orbat-class-group">
              <h2 className="orbat-class-header orbat-class-header--kronos">KRONOS PLATFORMS</h2>
              <div className="orbat-cards">
                {kronosAircraft.map((a) => (
                  <AircraftCard
                    key={a.id}
                    aircraft={a}
                    isSelected={a.id === selectedTypeId}
                    onClick={() => selectType(a.id === selectedTypeId ? null : a.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {showFullOrbat && CLASS_ORDER.map((cls) => {
            const items = groupedAircraft[cls];
            if (!items.length) return null;
            return (
              <div key={cls} className="orbat-class-group">
                <h2 className="orbat-class-header">{CLASS_LABELS[cls]}</h2>
                <div className="orbat-cards">
                  {items.map((a) => (
                    <AircraftCard
                      key={a.id}
                      aircraft={a}
                      isSelected={a.id === selectedTypeId}
                      onClick={() => selectType(a.id === selectedTypeId ? null : a.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {selectedAircraft && (
          <DetailPanel aircraft={selectedAircraft} onClose={() => selectType(null)} />
        )}
      </div>

      <style>{`
        .orbat-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-primary);
          color: var(--text-primary);
          overflow: hidden;
        }

        .orbat-panel__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 24px 32px 16px;
          border-bottom: 1px solid var(--border-default);
        }

        .orbat-panel__header h1 {
          font-family: var(--font-family);
          font-size: 28px;
          font-weight: 700;
          color: var(--color-accent);
          letter-spacing: 0.1em;
          margin: 0;
        }

        .orbat-panel__subtitle {
          font-size: 11px;
          color: var(--text-muted);
          letter-spacing: 0.15em;
        }

        .orbat-panel__close {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: 4px;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 700;
          padding: 8px 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .orbat-panel__close:hover {
          background: rgba(255, 68, 68, 0.2);
          border-color: var(--color-hostile);
          color: var(--color-hostile);
        }

        /* Stats Bar */
        .orbat-panel__stats {
          display: flex;
          gap: 16px;
          padding: 16px 32px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .orbat-stat-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 20px;
          background: var(--bg-secondary);
          border-radius: 8px;
          min-width: 80px;
        }

        .orbat-stat-box--accent {
          background: rgba(0, 188, 212, 0.15);
          border: 1px solid var(--color-accent);
        }

        .orbat-stat-box__value {
          font-family: var(--font-family);
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .orbat-stat-box--accent .orbat-stat-box__value {
          color: var(--color-accent);
        }

        .orbat-stat-box__label {
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.1em;
          margin-top: 2px;
        }

        /* Filters */
        .orbat-panel__filters {
          display: flex;
          gap: 12px;
          padding: 12px 32px;
          align-items: center;
        }

        .orbat-panel__filters select {
          background: var(--bg-secondary);
          border: 1px solid var(--border-default);
          border-radius: 6px;
          padding: 8px 12px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 12px;
          cursor: pointer;
        }

        .orbat-panel__filters select:focus {
          outline: none;
          border-color: var(--color-accent);
        }

        .orbat-clear-btn {
          background: transparent;
          border: 1px solid var(--text-muted);
          border-radius: 6px;
          padding: 8px 12px;
          color: var(--text-muted);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .orbat-clear-btn:hover {
          border-color: var(--color-hostile);
          color: var(--color-hostile);
        }

        .orbat-toggle-btn {
          margin-left: auto;
          background: rgba(0, 188, 212, 0.15);
          border: 1px solid rgba(0, 188, 212, 0.5);
          border-radius: 6px;
          padding: 8px 12px;
          color: var(--color-accent);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: all 0.2s;
        }

        .orbat-toggle-btn:hover {
          background: rgba(0, 188, 212, 0.3);
        }

        /* Loading & Error */
        .orbat-loading,
        .orbat-error {
          padding: 32px;
          text-align: center;
          font-size: 12px;
          letter-spacing: 0.1em;
        }

        .orbat-loading { color: var(--color-accent); }
        .orbat-error { color: var(--color-hostile); }

        /* Content Area */
        .orbat-panel__content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .orbat-grid {
          flex: 1;
          overflow-y: auto;
          padding: 16px 32px 32px;
        }

        /* Class Groups */
        .orbat-class-group {
          margin-bottom: 24px;
        }

        .orbat-class-header {
          font-family: var(--font-family);
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 0.15em;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .orbat-class-header--kronos {
          color: var(--color-accent);
          border-bottom-color: rgba(0, 188, 212, 0.4);
        }

        .orbat-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }

        /* Aircraft Card */
        .orbat-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .orbat-card:hover {
          border-color: rgba(0, 188, 212, 0.3);
          background: rgba(0, 188, 212, 0.05);
        }

        .orbat-card--selected {
          border-color: var(--color-accent);
          background: rgba(0, 188, 212, 0.1);
        }

        .orbat-card__header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .orbat-card__designation {
          font-family: var(--font-family);
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .orbat-card__name {
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 10px;
        }

        .orbat-card__stats {
          display: flex;
          gap: 10px;
          font-size: 11px;
          color: var(--color-friendly);
          margin-bottom: 8px;
        }

        .orbat-card__roles {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .orbat-role {
          font-size: 9px;
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        /* Badges */
        .orbat-badge {
          font-size: 8px;
          padding: 2px 5px;
          border-radius: 3px;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .orbat-badge--kronos {
          background: rgba(0, 188, 212, 0.2);
          color: var(--color-accent);
        }

        .orbat-badge--stealth {
          background: rgba(0, 230, 118, 0.2);
          color: var(--color-friendly);
        }

        .orbat-badge--uav {
          background: rgba(33, 150, 243, 0.2);
          color: var(--color-neutral);
        }

        .orbat-badge--supersonic {
          background: rgba(255, 68, 68, 0.2);
          color: var(--color-hostile);
        }

        /* Detail Panel */
        .orbat-detail {
          width: 380px;
          background: var(--bg-secondary);
          border-left: 1px solid var(--color-accent);
          overflow-y: auto;
          padding: 24px;
        }

        .orbat-detail__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .orbat-detail__id {
          font-family: var(--font-family);
          font-size: 32px;
          font-weight: 700;
          color: var(--color-accent);
          margin: 0;
        }

        .orbat-detail__name {
          font-size: 13px;
          color: var(--text-muted);
        }

        .orbat-detail__close {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          padding: 4px 8px;
        }

        .orbat-detail__close:hover {
          color: var(--color-hostile);
        }

        .orbat-detail__badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 24px;
        }

        .orbat-detail__badges .orbat-badge {
          font-size: 10px;
          padding: 4px 8px;
        }

        .orbat-detail__section {
          margin-bottom: 24px;
        }

        .orbat-detail__section h3 {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 0.15em;
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .orbat-detail__grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .orbat-stat {
          display: flex;
          flex-direction: column;
        }

        .orbat-stat label {
          font-size: 9px;
          color: var(--text-muted);
          letter-spacing: 0.1em;
          margin-bottom: 2px;
        }

        .orbat-stat span {
          font-family: var(--font-family);
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .orbat-detail__roles {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .orbat-role-tag {
          font-size: 10px;
          padding: 4px 10px;
          background: rgba(0, 230, 118, 0.1);
          border: 1px solid rgba(0, 230, 118, 0.3);
          border-radius: 4px;
          color: var(--color-friendly);
        }

        /* Scrollbar */
        .orbat-grid::-webkit-scrollbar,
        .orbat-detail::-webkit-scrollbar {
          width: 6px;
        }

        .orbat-grid::-webkit-scrollbar-track,
        .orbat-detail::-webkit-scrollbar-track {
          background: transparent;
        }

        .orbat-grid::-webkit-scrollbar-thumb,
        .orbat-detail::-webkit-scrollbar-thumb {
          background: var(--border-default);
          border-radius: 3px;
        }

        .orbat-grid::-webkit-scrollbar-thumb:hover,
        .orbat-detail::-webkit-scrollbar-thumb:hover {
          background: var(--border-strong);
        }
      `}</style>
    </div>
  );
};
