import { type FC, Suspense, useState, useCallback, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useEntityMovement } from './hooks/useEntityMovement';
import { useScenarioEntities } from './hooks/useScenarioEntities';
import {
  ConnectionBadge,
  WeaponsStatus,
  SafeModeOverlay,
  AlertBanner,
} from './components/status';
import { TacticalMap, getGlobalViewer } from './components/tactical';
import { AuthDialog, ScenarioSelector, MissionBriefing, MissionAlertOverlay, type MissionAlert } from './components/dialogs';
import { AuditPanel, ForensicsPanel, MissionEventPanel, TacticalRadar, AuthQueuePanel, SelectedEntityPanel, MissionBriefingBanner, CompactInstructorControls, AssetPanel } from './components/panels';
import { ErrorBoundary, TacticalMapErrorBoundary } from './components/ErrorBoundary';
import { useEntityStore } from './stores/entityStore';
import { useUIStore } from './stores/uiStore';
import { flyToEntities, flyToLocation } from './lib/cesium-config';
import { SCENARIOS, type Scenario, getScenarioByKey } from './lib/scenarios';

/**
 * KRONOS Application Root Component
 *
 * Layout Structure:
 * ┌─────────────────────────────────────────────┐
 * │              Alert Banner (64px)            │
 * ├─────────────────────────────────┬───────────┤
 * │                                 │  Status   │
 * │         Main Content            │   Rail    │
 * │           (Cesium)              │  (200px)  │
 * │                                 │           │
 * └─────────────────────────────────┴───────────┘
 */
const App: FC = () => {
  // Initialize WebSocket connection
  const { send } = useWebSocket({ autoConnect: true });

  // Enable entity movement animation when mission is active
  useEntityMovement();

  // Entity state
  const entities = useEntityStore((s) => s.entities);
  const entityCount = entities.size;
  const phase = useEntityStore((s) => s.phase);
  const tracks = useEntityStore((s) => s.tracks);
  const trackCount = Array.from(tracks.values()).filter((t) => !t.destroyed).length;
  const aiEnabled = useEntityStore((s) => s.aiEnabled);
  const setAiEnabled = useEntityStore((s) => s.setAiEnabled);

  const [showAudit] = useState(false);
  const [showForensics, setShowForensics] = useState(false);
  const [showEventLog] = useState(true);

  // Scenario selection state - always use first scenario as default
  // SCENARIOS is a constant array with 6 elements, so [0] is always defined
  const [currentScenario, setCurrentScenario] = useState<Scenario>(SCENARIOS[0]!);
  const [showScenarioSelector, setShowScenarioSelector] = useState(false);
  const [showMissionBriefing, setShowMissionBriefing] = useState(false);

  // Centered mission alert overlay state
  const [centeredAlert, setCenteredAlert] = useState<MissionAlert | null>(null);
  const alerts = useUIStore((s) => s.alerts);
  const dismissAlert = useUIStore((s) => s.dismissAlert);

  // Watch for MISSION/THREAT/COMBAT alerts to show centered
  useEffect(() => {
    const centerCategories = ["MISSION", "THREAT", "INTEL", "COMBAT"];
    const latestCenterAlert = alerts
      .filter((a) => !a.dismissed && centerCategories.includes(a.category))
      .sort((a, b) => b.receivedAt - a.receivedAt)[0];

    if (latestCenterAlert && (!centeredAlert || latestCenterAlert.alert_id !== centeredAlert.id)) {
      const alertData: MissionAlert = {
        id: latestCenterAlert.alert_id,
        message: latestCenterAlert.message,
        category: latestCenterAlert.category as MissionAlert["category"],
        duration: (latestCenterAlert.timeout_sec ?? 5) * 1000,
      };
      if (latestCenterAlert.title) {
        alertData.title = latestCenterAlert.title;
      }
      setCenteredAlert(alertData);
    }
  }, [alerts, centeredAlert]);

  // Handle dismissing centered alert
  const handleDismissCenteredAlert = useCallback(() => {
    if (centeredAlert) {
      dismissAlert(centeredAlert.id);
      setCenteredAlert(null);
    }
  }, [centeredAlert, dismissAlert]);

  // Spawn mock entities from scenario when backend unavailable
  useScenarioEntities(currentScenario);

  // Keyboard shortcuts for scenario selection (1-6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if modal is open or in an input
      if (showScenarioSelector) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // 1-6 to open scenario selector with that scenario selected
      if (e.key >= "1" && e.key <= "6") {
        e.preventDefault();
        const scenario = getScenarioByKey(e.key);
        if (scenario) {
          setCurrentScenario(scenario);
          setShowScenarioSelector(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showScenarioSelector]);

  // Handle scenario selection - opens the cinematic briefing
  const handleSelectScenario = useCallback((scenario: Scenario) => {
    setCurrentScenario(scenario);
    setShowScenarioSelector(false);
    setShowMissionBriefing(true);
    // Tell the mock server which scenario to load
    send({ type: "SELECT_SCENARIO", scenario_id: scenario.id });
    console.log(`[KRONOS] Starting briefing for: ${scenario.id} - ${scenario.name}`);
  }, [send]);

  // Handle briefing complete - start the mission
  const handleBriefingStart = useCallback(() => {
    setShowMissionBriefing(false);
    // Send START_DEMO to the backend
    send({ type: "START_DEMO" });
    console.log(`[KRONOS] Mission started: ${currentScenario.id} - ${currentScenario.name}`);

    // Fly camera to first asset position
    setTimeout(() => {
      const viewer = getGlobalViewer();
      const firstAsset = currentScenario.briefing.assets[0];
      if (viewer && firstAsset) {
        flyToLocation(viewer, firstAsset.end.lat, firstAsset.end.lon, 15000, 2);  // 15km altitude
      }
    }, 500);
  }, [currentScenario, send]);

  // Handle briefing skip - close without cinematic
  const handleBriefingSkip = useCallback(() => {
    setShowMissionBriefing(false);
    // Still start the demo even when skipping briefing
    send({ type: "START_DEMO" });
    console.log(`[KRONOS] Briefing skipped for: ${currentScenario.id}`);

    // Fly camera to first asset position
    setTimeout(() => {
      const viewer = getGlobalViewer();
      const firstAsset = currentScenario.briefing.assets[0];
      if (viewer && firstAsset) {
        flyToLocation(viewer, firstAsset.end.lat, firstAsset.end.lon, 15000, 2);  // 15km altitude
      }
    }, 500);
  }, [currentScenario, send]);

  // Restart demo handler
  const handleRestartDemo = useCallback(() => {
    send({ type: "RESTART_DEMO" });
    console.log("[KRONOS] Demo restarted");
  }, [send]);

  // AI toggle handler
  const handleAiToggle = useCallback(() => {
    const newState = !aiEnabled;
    setAiEnabled(newState);
    send({ type: "SET_AI_MODE", enabled: newState });
    console.log(`[KRONOS] AI mode: ${newState ? "ON" : "OFF"}`);
  }, [aiEnabled, setAiEnabled, send]);

  // Fly to assets handler
  const handleFlyToAssets = useCallback(() => {
    const viewer = getGlobalViewer();
    if (viewer && entities.size > 0) {
      const positions = Array.from(entities.values()).map((e) => e.position);
      flyToEntities(viewer, positions);
    }
  }, [entities]);

  return (
    <div className="app-container tactical-hud">
      {/* Global Cinematic Mask */}
      <div className="tactical-mask" />

      {/* Alert Banner - Fixed Top (Glass style) */}
      <header className="alert-banner glass-hud">
        <div className="alert-banner__content">
          <div className="alert-banner__left">
            <span className="alert-banner__title phosphor-glow">KRONOS // C2</span>
            <button
              className="scenario-badge glass-panel"
              onClick={() => setShowScenarioSelector(true)}
              title="Click to select scenario (1-6)"
            >
              <span className="scenario-badge__key">{currentScenario.key}</span>
              <span className="scenario-badge__name">{currentScenario.name}</span>
            </button>
          </div>
          <div className="alert-banner__controls">
            <span className={`phase-badge phase-badge--${phase.toLowerCase()} glass-panel`}>
              {phase}
            </span>

            <button
              className={`ai-toggle glass-panel ${aiEnabled ? 'ai-toggle--on' : 'ai-toggle--off'}`}
              onClick={handleAiToggle}
            >
              AI: {aiEnabled ? 'ACTIVE' : 'OFF'}
            </button>

            <button className="restart-button glass-panel" onClick={handleRestartDemo}>
              RESET
            </button>

            <button
              className={`forensics-button glass-panel ${showForensics ? 'forensics-button--active' : ''}`}
              onClick={() => setShowForensics(!showForensics)}
              title="Toggle Forensics Viewer"
            >
              FORENSICS
            </button>

            <button
              className="fly-to-button glass-panel"
              onClick={handleFlyToAssets}
              disabled={entityCount === 0}
            >
              CENTER ASSETS ({entityCount})
            </button>
            <ConnectionBadge />
          </div>
        </div>
      </header>

      {/* Mission Briefing Banner - Shows when mission is active AND briefing modal closed */}
      {!showMissionBriefing && <MissionBriefingBanner scenario={currentScenario} />}

      {/* Main Layout */}
      <div className="main-layout">
        {/* Left Panel - Hidden during mission briefing modal */}
        {!showMissionBriefing && (
          <aside className="left-panel">
            {/* Asset Selection Panel */}
            <div className="left-panel__section">
              <ErrorBoundary>
                <AssetPanel />
              </ErrorBoundary>
            </div>

            {/* Selected Entity Details */}
            <div className="left-panel__section">
              <ErrorBoundary>
                <SelectedEntityPanel />
              </ErrorBoundary>
            </div>

            {showAudit && (
              <div className="left-panel__section left-panel__section--grow">
                <ErrorBoundary>
                  <AuditPanel />
                </ErrorBoundary>
              </div>
            )}

            {showForensics && (
              <div className="left-panel__section left-panel__section--grow">
                <ErrorBoundary>
                  <ForensicsPanel />
                </ErrorBoundary>
              </div>
            )}
          </aside>
        )}

        {/* Main Content Area - Cesium Globe */}
        <main className="main-content">
          <TacticalMapErrorBoundary>
            <Suspense
              fallback={
                <div className="main-content__placeholder">
                  <h1>KRONOS Autonomy Platform</h1>
                  <p>Loading tactical display...</p>
                </div>
              }
            >
              <TacticalMap />
            </Suspense>
          </TacticalMapErrorBoundary>

        </main>

        {/* Status Rail - Fixed Right */}
        <aside className="status-rail">
          {/* Authorization Queue - Critical for human-in-the-loop */}
          <div className="status-rail__section">
            <ErrorBoundary>
              <AuthQueuePanel />
            </ErrorBoundary>
          </div>

          {/* Mission Info - Current scenario details */}
          <div className="status-rail__section mission-info">
            <h2 className="status-rail__heading">Mission</h2>
            <div className="mission-info__content">
              <div className="mission-info__header">
                <span className="mission-info__key">{currentScenario.key}</span>
                <span className="mission-info__name">{currentScenario.shortName}</span>
              </div>
              <div className="mission-info__duration">{currentScenario.duration}</div>
              <div className="mission-info__learning">{currentScenario.learning}</div>
              <div className="mission-info__assets">
                {currentScenario.assets.map((asset, i) => (
                  <span key={i} className="mission-info__asset">
                    {asset.count}x {asset.type}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Tactical Radar */}
          <div className="status-rail__section">
            <TacticalRadar />
          </div>

          {/* Mission Events - Right side for visibility */}
          {showEventLog && (
            <div className="status-rail__section status-rail__section--events">
              <ErrorBoundary>
                <MissionEventPanel />
              </ErrorBoundary>
            </div>
          )}

          {/* Force Status */}
          <div className="status-rail__section">
            <h2 className="status-rail__heading">Force Status</h2>
            <div className="status-rail__metrics">
              <div className="status-rail__metric status-rail__metric--friendly">
                <span className="status-rail__metric-value">{entityCount}</span>
                <span className="status-rail__metric-label">FRIENDLY</span>
              </div>
              <div className="status-rail__metric status-rail__metric--hostile">
                <span className="status-rail__metric-value">{trackCount}</span>
                <span className="status-rail__metric-label">HOSTILE</span>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="status-rail__section">
            <h2 className="status-rail__heading">System Status</h2>
            <ul className="status-rail__list">
              <li className="status-rail__item status-rail__item--ok">
                Comms: Online
              </li>
              <li className="status-rail__item status-rail__item--ok">
                Sensors: Active
              </li>
              <li className="status-rail__item status-rail__item--warning">
                GPS: Degraded
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Safety UI - ALWAYS VISIBLE */}
      <SafeModeOverlay />
      <AlertBanner />
      <WeaponsStatus />

      {/* Auth Dialog - Modal for authorization requests */}
      <AuthDialog />

      {/* Centered Mission Alert Overlay - For critical MISSION/THREAT/INTEL/COMBAT alerts */}
      <MissionAlertOverlay
        alert={centeredAlert}
        onDismiss={handleDismissCenteredAlert}
      />

      {/* Scenario Selector Modal */}
      <ScenarioSelector
        isOpen={showScenarioSelector}
        onClose={() => setShowScenarioSelector(false)}
        onSelectScenario={handleSelectScenario}
        currentScenarioId={currentScenario.id}
      />

      {/* Mission Briefing - Cinematic intro sequence */}
      <MissionBriefing
        scenario={currentScenario}
        isOpen={showMissionBriefing}
        onStart={handleBriefingStart}
        onSkip={handleBriefingSkip}
      />

      {/* Footer Controls - Fixed bottom */}
      <CompactInstructorControls
        currentScenario={currentScenario}
        onSelectScenario={handleSelectScenario}
        onStart={handleBriefingStart}
        onReset={handleRestartDemo}
      />

      <style>{`
        .app-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          overflow: hidden;
        }

        /* Alert Banner */
        .alert-banner {
          flex-shrink: 0;
          height: var(--alert-banner-height);
          background-color: var(--bg-secondary);
          border-bottom: 1px solid var(--border-default);
          display: flex;
          align-items: center;
          padding: 0 var(--spacing-lg);
          z-index: var(--z-alert);
        }

        .alert-banner__content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .alert-banner__left {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
        }

        .alert-banner__title {
          font-size: var(--font-size-xl);
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--color-accent);
        }

        .scenario-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background-color: var(--color-friendly);
          color: var(--bg-primary);
          font-size: var(--font-size-sm);
          font-weight: 700;
          letter-spacing: 0.02em;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .scenario-badge:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .scenario-badge__key {
          padding: 2px 6px;
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
          font-family: var(--font-family-mono);
          font-size: 11px;
        }

        .scenario-badge__name {
          font-weight: 700;
        }

        .scenario-badge__arrow {
          opacity: 0.7;
          font-size: 10px;
          margin-left: 4px;
        }

        .alert-banner__status {
          font-size: var(--font-size-sm);
          color: var(--color-friendly);
          font-family: var(--font-family-mono);
        }

        .alert-banner__controls {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .fly-to-button {
          padding: 6px 12px;
          background-color: var(--color-accent);
          border: none;
          border-radius: 4px;
          color: var(--bg-primary);
          font-size: var(--font-size-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .fly-to-button:hover {
          filter: brightness(1.1);
        }

        .fly-to-button:disabled {
          background-color: var(--bg-tertiary);
          color: var(--text-muted);
          cursor: not-allowed;
        }

        /* Phase Badge */
        .phase-badge {
          padding: 4px 10px;
          font-size: var(--font-size-xs);
          font-weight: 700;
          font-family: var(--font-family-mono);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-radius: 4px;
          background-color: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .phase-badge--idle {
          background-color: var(--bg-tertiary);
          color: var(--text-muted);
        }

        .phase-badge--briefing,
        .phase-badge--patrol {
          background-color: rgba(0, 230, 118, 0.2);
          color: var(--color-friendly);
        }

        .phase-badge--detection,
        .phase-badge--auth_pending {
          background-color: rgba(255, 171, 0, 0.2);
          color: var(--color-warning);
        }

        .phase-badge--scramble,
        .phase-badge--transit {
          background-color: rgba(0, 188, 212, 0.2);
          color: var(--color-accent);
          animation: phase-pulse 2s ease-in-out infinite;
        }

        .phase-badge--engaging {
          background-color: rgba(255, 68, 68, 0.2);
          color: var(--color-hostile);
          animation: phase-pulse 1s ease-in-out infinite;
        }

        .phase-badge--complete {
          background-color: rgba(0, 230, 118, 0.3);
          color: var(--color-friendly);
        }

        .phase-badge--failed {
          background-color: rgba(255, 68, 68, 0.3);
          color: var(--color-hostile);
        }

        @keyframes phase-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        /* AI Toggle */
        .ai-toggle {
          padding: 6px 14px;
          font-size: var(--font-size-sm);
          font-weight: 700;
          font-family: var(--font-family-mono);
          border-radius: 4px;
          border: 2px solid;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ai-toggle--on {
          background-color: rgba(0, 230, 118, 0.15);
          border-color: var(--color-friendly);
          color: var(--color-friendly);
          box-shadow: 0 0 8px rgba(0, 230, 118, 0.3);
        }

        .ai-toggle--on:hover {
          background-color: rgba(0, 230, 118, 0.25);
          box-shadow: 0 0 12px rgba(0, 230, 118, 0.4);
        }

        .ai-toggle--off {
          background-color: rgba(255, 171, 0, 0.15);
          border-color: var(--color-warning);
          color: var(--color-warning);
        }

        .ai-toggle--off:hover {
          background-color: rgba(255, 171, 0, 0.25);
        }

        /* Restart Button */
        .restart-button {
          padding: 6px 12px;
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: 4px;
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .restart-button:hover {
          background-color: rgba(255, 68, 68, 0.2);
          border-color: var(--color-hostile);
          color: var(--color-hostile);
        }

        /* Forensics Button */
        .forensics-button {
          padding: 6px 12px;
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: 4px;
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .forensics-button:hover {
          background-color: rgba(0, 188, 212, 0.2);
          border-color: var(--color-accent);
          color: var(--color-accent);
        }

        .forensics-button--active {
          background-color: var(--color-accent);
          border-color: var(--color-accent);
          color: var(--bg-primary);
        }

        .forensics-button--active:hover {
          background-color: var(--color-accent);
          filter: brightness(1.1);
        }

        .panel-toggle {
          padding: 6px 12px;
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: 4px;
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .panel-toggle:hover {
          background-color: var(--bg-secondary);
          border-color: var(--border-subtle);
        }

        .panel-toggle--active {
          background-color: var(--color-accent);
          border-color: var(--color-accent);
          color: var(--bg-primary);
        }

        /* Main Layout */
        .main-layout {
          flex: 1;
          display: flex;
          overflow: hidden;
          min-height: 0;
        }

        /* Left Panel */
        .left-panel {
          flex-shrink: 0;
          width: 320px;
          background-color: var(--bg-primary);
          border-right: 1px solid var(--border-default);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: var(--spacing-md);
          gap: var(--spacing-md);
        }

        .left-panel__section {
          flex-shrink: 0;
        }

        .left-panel__section--grow {
          flex: 1;
          min-height: 200px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .left-panel__section--grow > * {
          flex: 1;
          overflow: hidden;
        }

        /* Main Content */
        .main-content {
          flex: 1;
          position: relative;
          background-color: var(--bg-primary);
          overflow: hidden;
        }

        .main-content__placeholder {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          color: var(--text-secondary);
        }

        .main-content__placeholder h1 {
          font-size: var(--font-size-2xl);
          font-weight: 700;
          margin-bottom: var(--spacing-md);
          color: var(--text-primary);
        }

        .main-content__placeholder p {
          font-size: var(--font-size-base);
        }

        /* Instructor Controls Overlay */
        .instructor-overlay {
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 100;
        }

        /* Status Rail */
        .status-rail {
          flex-shrink: 0;
          width: 280px; /* Wider to accommodate events panel */
          background-color: var(--bg-secondary);
          border-left: 1px solid var(--border-default);
          padding: var(--spacing-md);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .status-rail__section {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .status-rail__section--events {
          flex: 1;
          min-height: 200px;
          max-height: 350px;
          overflow: hidden;
        }

        .status-rail__heading {
          font-size: var(--font-size-xs);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          padding-bottom: var(--spacing-xs);
          border-bottom: 1px solid var(--border-subtle);
        }

        .status-rail__list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .status-rail__item {
          font-size: var(--font-size-sm);
          font-family: var(--font-family-mono);
          padding: var(--spacing-xs) 0;
        }

        .status-rail__item--ok {
          color: var(--color-friendly);
        }

        .status-rail__item--warning {
          color: var(--color-warning);
        }

        .status-rail__item--error {
          color: var(--color-hostile);
        }

        .status-rail__metric {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--spacing-md);
          background-color: var(--bg-tertiary);
          border-radius: 4px;
        }

        .status-rail__metric-value {
          font-size: var(--font-size-2xl);
          font-weight: 700;
          font-family: var(--font-family-mono);
          color: var(--text-primary);
        }

        .status-rail__metric-label {
          font-size: var(--font-size-xs);
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Mission Info Panel */
        .mission-info__content {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          padding: var(--spacing-sm);
          background-color: var(--bg-tertiary);
          border-radius: 4px;
        }

        .mission-info__header {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .mission-info__key {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background-color: var(--color-accent);
          color: var(--bg-primary);
          font-size: 11px;
          font-weight: 700;
          font-family: var(--font-family-mono);
          border-radius: 4px;
        }

        .mission-info__name {
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: var(--text-primary);
        }

        .mission-info__duration {
          font-size: var(--font-size-xs);
          color: var(--text-muted);
          font-family: var(--font-family-mono);
        }

        .mission-info__learning {
          font-size: var(--font-size-xs);
          color: var(--color-accent);
          font-style: italic;
          line-height: 1.4;
        }

        .mission-info__assets {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 4px;
        }

        .mission-info__asset {
          padding: 2px 6px;
          background-color: rgba(0, 230, 118, 0.15);
          color: var(--color-friendly);
          font-size: 10px;
          font-family: var(--font-family-mono);
          border-radius: 3px;
        }

        .status-rail__metrics {
          display: flex;
          gap: var(--spacing-sm);
        }

        .status-rail__metric--friendly .status-rail__metric-value {
          color: var(--color-friendly);
        }

        .status-rail__metric--hostile .status-rail__metric-value {
          color: var(--color-hostile);
        }
      `}</style>
    </div>
  );
};

export default App;
