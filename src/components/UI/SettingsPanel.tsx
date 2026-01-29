/**
 * Graphics Settings Panel
 *
 * User-facing UI for controlling graphics quality, post-processing effects,
 * and rendering options. Accessible via a gear icon button or 'Tab' key.
 */

import { useCallback } from 'react';
import {
  usePerformanceStore,
  usePerformanceSettings,
  usePerformanceTier,
  type QualityTier,
  type EffectToggleKey,
} from '../../store/performanceStore';

const PANEL_STYLE: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  width: '320px',
  height: '100vh',
  backgroundColor: 'rgba(16, 14, 30, 0.95)',
  borderLeft: '1px solid rgba(199, 146, 245, 0.2)',
  color: '#c8c0d8',
  fontFamily: 'monospace',
  fontSize: '13px',
  zIndex: 200,
  overflowY: 'auto',
  padding: '0',
  backdropFilter: 'blur(10px)',
  boxSizing: 'border-box',
};

const HEADER_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: '1px solid rgba(199, 146, 245, 0.15)',
  backgroundColor: 'rgba(26, 24, 52, 0.8)',
};

const SECTION_STYLE: React.CSSProperties = {
  padding: '12px 20px',
  borderBottom: '1px solid rgba(199, 146, 245, 0.08)',
};

const SECTION_TITLE_STYLE: React.CSSProperties = {
  color: '#c792f5',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '1.5px',
  marginBottom: '10px',
  fontWeight: 600,
};

const ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '4px 0',
  minHeight: '28px',
};

const LABEL_STYLE: React.CSSProperties = {
  color: '#a8a0b8',
  fontSize: '12px',
};

const TOGGLE_STYLE_BASE: React.CSSProperties = {
  width: '36px',
  height: '20px',
  borderRadius: '10px',
  border: 'none',
  cursor: 'pointer',
  position: 'relative',
  transition: 'background-color 0.2s',
  flexShrink: 0,
};

const TOGGLE_KNOB: React.CSSProperties = {
  width: '14px',
  height: '14px',
  borderRadius: '50%',
  backgroundColor: '#fff',
  position: 'absolute',
  top: '3px',
  transition: 'left 0.2s',
};

const TIER_BUTTON_BASE: React.CSSProperties = {
  flex: 1,
  padding: '6px 0',
  border: '1px solid rgba(199, 146, 245, 0.2)',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  fontFamily: 'monospace',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  transition: 'all 0.15s',
};

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        ...TOGGLE_STYLE_BASE,
        backgroundColor: enabled ? 'rgba(142, 236, 245, 0.6)' : 'rgba(80, 70, 100, 0.6)',
      }}
    >
      <div
        style={{
          ...TOGGLE_KNOB,
          left: enabled ? '19px' : '3px',
          backgroundColor: enabled ? '#8eecf5' : '#665878',
        }}
      />
    </button>
  );
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '80px',
          accentColor: '#8eecf5',
          cursor: 'pointer',
        }}
      />
      <span style={{ color: '#8eecf5', fontSize: '11px', minWidth: '28px', textAlign: 'right' }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export function SettingsPanel() {
  const panelOpen = usePerformanceStore((s) => s.settingsPanelOpen);
  const setOpen = usePerformanceStore((s) => s.setSettingsPanelOpen);
  const settings = usePerformanceSettings();
  const tier = usePerformanceTier();
  const setTier = usePerformanceStore((s) => s.setTier);
  const toggleEffect = usePerformanceStore((s) => s.toggleEffect);
  const setSetting = usePerformanceStore((s) => s.setSetting);
  const fps = usePerformanceStore((s) => s.fps);
  const hasManualOverrides = usePerformanceStore((s) => s.hasManualOverrides);

  const handleTierSelect = useCallback((t: QualityTier) => {
    setTier(t);
  }, [setTier]);

  const handleToggle = useCallback((key: EffectToggleKey) => {
    toggleEffect(key);
  }, [toggleEffect]);

  if (!panelOpen) return null;

  const tierOptions: QualityTier[] = ['low', 'medium', 'high'];

  return (
    <div style={PANEL_STYLE}>
      {/* Header */}
      <div style={HEADER_STYLE}>
        <span style={{ color: '#c792f5', fontSize: '14px', fontWeight: 700 }}>
          GRAPHICS SETTINGS
        </span>
        <button
          onClick={() => setOpen(false)}
          style={{
            background: 'none',
            border: '1px solid rgba(199, 146, 245, 0.3)',
            color: '#c792f5',
            cursor: 'pointer',
            padding: '4px 10px',
            borderRadius: '3px',
            fontFamily: 'monospace',
            fontSize: '12px',
          }}
        >
          CLOSE
        </button>
      </div>

      {/* FPS Display */}
      <div style={{ ...SECTION_STYLE, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#8eecf5', fontSize: '11px' }}>FPS</span>
        <span style={{
          color: fps >= 50 ? '#88ff88' : fps >= 30 ? '#ffcc44' : '#ff6666',
          fontSize: '16px',
          fontWeight: 700,
        }}>
          {Math.round(fps)}
        </span>
      </div>

      {/* Quality Tier */}
      <div style={SECTION_STYLE}>
        <div style={SECTION_TITLE_STYLE}>Quality Preset</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {tierOptions.map((t) => (
            <button
              key={t}
              onClick={() => handleTierSelect(t)}
              style={{
                ...TIER_BUTTON_BASE,
                backgroundColor: tier === t && !hasManualOverrides
                  ? 'rgba(142, 236, 245, 0.15)'
                  : 'rgba(40, 35, 60, 0.6)',
                borderColor: tier === t && !hasManualOverrides
                  ? 'rgba(142, 236, 245, 0.5)'
                  : 'rgba(199, 146, 245, 0.15)',
                color: tier === t && !hasManualOverrides ? '#8eecf5' : '#887898',
              }}
            >
              {t}
            </button>
          ))}
        </div>
        {hasManualOverrides && (
          <div style={{ color: '#887898', fontSize: '10px', marginTop: '6px' }}>
            Custom overrides active. Select a preset to reset.
          </div>
        )}
      </div>

      {/* Post-Processing Effects */}
      <div style={SECTION_STYLE}>
        <div style={SECTION_TITLE_STYLE}>Post-Processing</div>

        <div style={ROW_STYLE}>
          <span style={LABEL_STYLE}>Post-Processing</span>
          <Toggle
            enabled={settings.enablePostProcessing}
            onChange={() => handleToggle('enablePostProcessing')}
          />
        </div>

        <div style={ROW_STYLE}>
          <span style={{ ...LABEL_STYLE, paddingLeft: '12px' }}>Bloom</span>
          <Toggle
            enabled={settings.enableBloom}
            onChange={() => handleToggle('enableBloom')}
          />
        </div>

        <div style={ROW_STYLE}>
          <span style={{ ...LABEL_STYLE, paddingLeft: '12px' }}>Chromatic Aberration</span>
          <Toggle
            enabled={settings.enableChromaticAberration}
            onChange={() => handleToggle('enableChromaticAberration')}
          />
        </div>

        <div style={ROW_STYLE}>
          <span style={{ ...LABEL_STYLE, paddingLeft: '12px' }}>Vignette</span>
          <Toggle
            enabled={settings.enableVignette}
            onChange={() => handleToggle('enableVignette')}
          />
        </div>

        <div style={ROW_STYLE}>
          <span style={{ ...LABEL_STYLE, paddingLeft: '12px' }}>Glitch Effects</span>
          <Toggle
            enabled={settings.enableGlitch}
            onChange={() => handleToggle('enableGlitch')}
          />
        </div>
      </div>

      {/* Rendering */}
      <div style={SECTION_STYLE}>
        <div style={SECTION_TITLE_STYLE}>Rendering</div>

        <div style={ROW_STYLE}>
          <span style={LABEL_STYLE}>Anti-Aliasing</span>
          <Toggle
            enabled={settings.antialias}
            onChange={() => handleToggle('antialias')}
          />
        </div>

        <div style={ROW_STYLE}>
          <span style={LABEL_STYLE}>Shadows</span>
          <Toggle
            enabled={settings.enableShadows}
            onChange={() => handleToggle('enableShadows')}
          />
        </div>

        <div style={ROW_STYLE}>
          <span style={LABEL_STYLE}>Pixel Ratio</span>
          <Slider
            value={settings.pixelRatio}
            min={0.5}
            max={Math.min(window.devicePixelRatio, 3)}
            step={0.25}
            onChange={(v) => setSetting('pixelRatio', v)}
          />
        </div>

        <div style={ROW_STYLE}>
          <span style={LABEL_STYLE}>Particles</span>
          <Slider
            value={settings.particleMultiplier}
            min={0}
            max={1.5}
            step={0.1}
            onChange={(v) => setSetting('particleMultiplier', v)}
          />
        </div>

        <div style={ROW_STYLE}>
          <span style={LABEL_STYLE}>Max Lights</span>
          <Slider
            value={settings.maxLights}
            min={1}
            max={5}
            step={1}
            onChange={(v) => setSetting('maxLights', v)}
          />
        </div>
      </div>

      {/* Info */}
      <div style={{ ...SECTION_STYLE, borderBottom: 'none' }}>
        <div style={{ color: '#665878', fontSize: '10px', lineHeight: '1.6' }}>
          Press Tab to toggle this panel.
          <br />
          Changes apply immediately.
          <br />
          Select a quality preset to reset all overrides.
        </div>
      </div>
    </div>
  );
}

/**
 * Settings gear button — fixed position, opens the settings panel.
 */
export function SettingsButton() {
  const togglePanel = usePerformanceStore((s) => s.toggleSettingsPanel);
  const panelOpen = usePerformanceStore((s) => s.settingsPanelOpen);

  return (
    <button
      onClick={togglePanel}
      title="Graphics Settings (Tab)"
      style={{
        position: 'fixed',
        top: '12px',
        right: '12px',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: '1px solid rgba(199, 146, 245, 0.3)',
        backgroundColor: panelOpen
          ? 'rgba(142, 236, 245, 0.15)'
          : 'rgba(26, 24, 52, 0.7)',
        color: panelOpen ? '#8eecf5' : '#c792f5',
        cursor: 'pointer',
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 201,
        backdropFilter: 'blur(4px)',
        transition: 'all 0.15s',
      }}
    >
      {/* Gear SVG icon */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  );
}

export default SettingsPanel;
