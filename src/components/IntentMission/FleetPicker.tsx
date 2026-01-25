/**
 * FleetPicker - Modal for selecting aircraft from populated fleet
 *
 * Features:
 * - Filter by platform type (ALL / STRIGOI / VULTUR / CORVUS)
 * - Shows only PARKED + READY aircraft
 * - Virtualized list (react-window) for 500+ aircraft
 * - Distance column showing proximity to mission AO
 * - Auto-sorted by distance (closest first)
 */

import { type FC, useState, useMemo } from "react";
import { FixedSizeList as List, type ListChildComponentProps } from "react-window";
import { useFleetStore, type PlatformType, type FleetEntity } from "../../stores/fleetStore";

interface FleetPickerProps {
  missionId: string;
  onAssign: (entityId: string) => void;
  onClose: () => void;
}

type FilterTab = "ALL" | PlatformType;

// Platform colors for badges
const PLATFORM_COLORS: Record<PlatformType, string> = {
  STRIGOI: "#22c55e",
  VULTUR: "#8b5cf6",
  CORVUS: "#f59e0b",
};

// Row data type for virtualized list
interface FleetRowData {
  entity: FleetEntity;
  distanceKm: number;
}

export const FleetPicker: FC<FleetPickerProps> = ({
  missionId: _missionId,
  onAssign,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Use sorted fleet (by distance to AO)
  const getAvailableFleetSorted = useFleetStore((state) => state.getAvailableFleetSorted);

  // Get available fleet sorted by distance and filter
  const fleetWithDistance = useMemo(() => {
    let fleet = getAvailableFleetSorted();

    // Filter by platform type
    if (activeTab !== "ALL") {
      fleet = fleet.filter((item) => item.entity.platformType === activeTab);
    }

    // Filter by search query (callsign or home base)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      fleet = fleet.filter(
        (item) =>
          item.entity.callsign.toLowerCase().includes(query) ||
          item.entity.homeBase.toLowerCase().includes(query)
      );
    }

    return fleet;
  }, [getAvailableFleetSorted, activeTab, searchQuery]);

  // Count by platform for tabs (computed from unfiltered fleet)
  const counts = useMemo(() => {
    const all = getAvailableFleetSorted();
    return {
      ALL: all.length,
      STRIGOI: all.filter((item) => item.entity.platformType === "STRIGOI").length,
      VULTUR: all.filter((item) => item.entity.platformType === "VULTUR").length,
      CORVUS: all.filter((item) => item.entity.platformType === "CORVUS").length,
    };
  }, [getAvailableFleetSorted]);

  const handleAssign = () => {
    if (selectedId) {
      onAssign(selectedId);
    }
  };

  const selectedItem = selectedId
    ? fleetWithDistance.find((item) => item.entity.id === selectedId)
    : null;
  const selectedEntity = selectedItem?.entity ?? null;

  return (
    <div className="fleet-picker-overlay" onClick={onClose}>
      <div className="fleet-picker" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="picker-header">
          <h2>SELECT ASSET</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div className="filter-tabs">
          {(["ALL", "STRIGOI", "VULTUR", "CORVUS"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
              style={
                tab !== "ALL" && activeTab === tab
                  ? { borderColor: PLATFORM_COLORS[tab as PlatformType] }
                  : undefined
              }
            >
              {tab} ({counts[tab]})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search callsign or base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Fleet List Header */}
        <div className="fleet-list-header">
          <span className="col-callsign">CALLSIGN</span>
          <span className="col-platform">TYPE</span>
          <span className="col-base">BASE</span>
          <span className="col-distance">DISTANCE</span>
          <span className="col-fuel">FUEL</span>
        </div>

        {/* Virtualized Fleet List */}
        <div className="fleet-list">
          {fleetWithDistance.length === 0 ? (
            <div className="no-results">
              No available aircraft{activeTab !== "ALL" ? ` (${activeTab})` : ""}
            </div>
          ) : (
            <List
              height={350}
              itemCount={fleetWithDistance.length}
              itemSize={44}
              width="100%"
              itemData={{
                items: fleetWithDistance,
                selectedId,
                onSelect: setSelectedId,
              }}
            >
              {VirtualizedFleetRow}
            </List>
          )}
        </div>

        {/* Footer */}
        <div className="picker-footer">
          {selectedEntity && (
            <div className="selected-info">
              <span className="selected-label">Selected:</span>
              <span className="selected-callsign">{selectedEntity.callsign}</span>
              <span
                className="selected-platform"
                style={{ color: PLATFORM_COLORS[selectedEntity.platformType] }}
              >
                {selectedEntity.platformType}
              </span>
            </div>
          )}
          <div className="footer-actions">
            <button className="cancel-btn" onClick={onClose}>
              CANCEL
            </button>
            <button
              className="assign-btn"
              onClick={handleAssign}
              disabled={!selectedId}
            >
              ASSIGN TO MISSION
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .fleet-picker-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .fleet-picker {
          background: linear-gradient(180deg, #0a1628 0%, #0d1f35 100%);
          border: 1px solid #1e3a5f;
          border-radius: 8px;
          width: 500px;
          max-width: 90vw;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          font-family: 'JetBrains Mono', monospace;
          box-shadow: 0 16px 64px rgba(0, 0, 0, 0.6);
        }

        .picker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #1e3a5f;
        }

        .picker-header h2 {
          margin: 0;
          font-size: 14px;
          color: #22d3ee;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .close-btn {
          background: none;
          border: none;
          color: #64748b;
          font-size: 24px;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }

        .close-btn:hover {
          color: #ef4444;
        }

        .filter-tabs {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid #1e3a5f;
        }

        .tab {
          flex: 1;
          background: #0f1f32;
          border: 1px solid #1e3a5f;
          color: #64748b;
          font-size: 10px;
          padding: 8px;
          border-radius: 4px;
          cursor: pointer;
          font-family: inherit;
          text-transform: uppercase;
          transition: all 0.2s;
        }

        .tab:hover {
          background: #1e3a5f;
          color: #e2e8f0;
        }

        .tab.active {
          background: #1e3a5f;
          color: #e2e8f0;
          border-color: #3b82f6;
        }

        .search-bar {
          padding: 12px 16px;
          border-bottom: 1px solid #1e3a5f;
        }

        .search-bar input {
          width: 100%;
          background: #0f1f32;
          border: 1px solid #1e3a5f;
          border-radius: 4px;
          padding: 10px 12px;
          color: #e2e8f0;
          font-family: inherit;
          font-size: 12px;
        }

        .search-bar input::placeholder {
          color: #475569;
        }

        .search-bar input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .fleet-list-header {
          display: grid;
          grid-template-columns: 1fr 80px 70px 80px 50px;
          gap: 8px;
          padding: 8px 16px;
          background: #0a1628;
          border-bottom: 1px solid #1e3a5f;
          font-size: 9px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .col-distance {
          text-align: center;
        }

        .col-fuel {
          text-align: right;
        }

        .fleet-list {
          flex: 1;
          overflow: hidden;
          padding: 4px 8px;
          min-height: 200px;
        }

        .no-results {
          text-align: center;
          padding: 32px;
          color: #64748b;
          font-size: 12px;
        }

        .fleet-row {
          display: grid;
          grid-template-columns: 1fr 80px 70px 80px 50px;
          gap: 8px;
          padding: 8px 12px;
          background: #0f1f32;
          border: 1px solid #1e3a5f;
          border-radius: 4px;
          margin: 2px 0;
          cursor: pointer;
          transition: all 0.15s;
          align-items: center;
          box-sizing: border-box;
        }

        .fleet-row:hover {
          background: #1e3a5f;
          border-color: #3b82f6;
        }

        .fleet-row.selected {
          background: #1e3a5f;
          border-color: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.2);
        }

        .row-callsign {
          font-size: 11px;
          font-weight: 600;
          color: #e2e8f0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .row-platform {
          font-size: 9px;
          padding: 2px 4px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.1);
          text-align: center;
        }

        .row-base {
          font-size: 10px;
          color: #64748b;
          text-align: center;
        }

        .row-distance {
          font-size: 10px;
          text-align: center;
          font-weight: 500;
        }

        .dist-close { color: #22c55e; }
        .dist-mid { color: #f59e0b; }
        .dist-far { color: #64748b; }

        .row-fuel {
          font-size: 10px;
          text-align: right;
        }

        .fuel-good { color: #22c55e; }
        .fuel-mid { color: #f59e0b; }
        .fuel-low { color: #ef4444; }

        .picker-footer {
          padding: 16px;
          border-top: 1px solid #1e3a5f;
        }

        .selected-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding: 8px 12px;
          background: #0f1f32;
          border-radius: 4px;
        }

        .selected-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
        }

        .selected-callsign {
          font-size: 12px;
          font-weight: 600;
          color: #22c55e;
        }

        .selected-platform {
          font-size: 10px;
          margin-left: auto;
        }

        .footer-actions {
          display: flex;
          gap: 12px;
        }

        .cancel-btn {
          flex: 1;
          background: #0f1f32;
          border: 1px solid #1e3a5f;
          color: #64748b;
          font-size: 12px;
          padding: 10px;
          border-radius: 4px;
          cursor: pointer;
          font-family: inherit;
          text-transform: uppercase;
        }

        .cancel-btn:hover {
          background: #1e3a5f;
          color: #e2e8f0;
        }

        .assign-btn {
          flex: 2;
          background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
          border: 1px solid #22c55e;
          color: white;
          font-size: 12px;
          font-weight: 600;
          padding: 10px;
          border-radius: 4px;
          cursor: pointer;
          font-family: inherit;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .assign-btn:disabled {
          background: #1e3a5f;
          border-color: #1e3a5f;
          color: #475569;
          cursor: not-allowed;
        }

        .assign-btn:not(:disabled):hover {
          background: linear-gradient(180deg, #4ade80 0%, #22c55e 100%);
        }
      `}</style>
    </div>
  );
};

// Item data for virtualized list
interface VirtualizedRowData {
  items: FleetRowData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// Virtualized fleet row for react-window
const VirtualizedFleetRow: FC<ListChildComponentProps<VirtualizedRowData>> = ({
  index,
  style,
  data,
}) => {
  const { items, selectedId, onSelect } = data;
  const item = items[index];
  if (!item) return null;

  const { entity, distanceKm } = item;
  const isSelected = selectedId === entity.id;

  const fuelClass =
    entity.fuelPercent >= 80 ? "fuel-good" :
    entity.fuelPercent >= 50 ? "fuel-mid" : "fuel-low";

  // Distance class for visual feedback
  const distanceClass =
    distanceKm <= 200 ? "dist-close" :
    distanceKm <= 500 ? "dist-mid" : "dist-far";

  return (
    <div
      style={style}
      className={`fleet-row ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(entity.id)}
    >
      <span className="row-callsign">{entity.callsign}</span>
      <span
        className="row-platform"
        style={{ color: PLATFORM_COLORS[entity.platformType] }}
      >
        {entity.platformType}
      </span>
      <span className="row-base">{entity.homeBase}</span>
      <span className={`row-distance ${distanceClass}`}>
        {distanceKm > 0 ? `${distanceKm} km` : "—"}
      </span>
      <span className={`row-fuel ${fuelClass}`}>{entity.fuelPercent}%</span>
    </div>
  );
};
