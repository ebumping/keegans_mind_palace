/**
 * GroundedHint - Displays "You are grounded here" message when Space is pressed
 *
 * Listens for the 'ground-cue' CustomEvent dispatched by NavigationSystem
 * and shows a brief fade-in/fade-out message. Debounced to prevent spam
 * when holding the Space key.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export function GroundedHint() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const cooldownRef = useRef(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGroundCue = useCallback(() => {
    // Debounce: ignore if still in cooldown from last activation
    if (cooldownRef.current) return;

    cooldownRef.current = true;

    // Clear any existing timers
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    // Show the message
    setVisible(true);
    setFading(false);

    // Start fade-out after 1.5 seconds
    fadeTimerRef.current = setTimeout(() => {
      setFading(true);

      // Remove from DOM after fade-out completes
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
        setFading(false);
      }, 800);
    }, 1500);

    // Release cooldown after 2 seconds
    setTimeout(() => {
      cooldownRef.current = false;
    }, 2000);
  }, []);

  useEffect(() => {
    window.addEventListener('ground-cue', handleGroundCue);
    return () => {
      window.removeEventListener('ground-cue', handleGroundCue);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [handleGroundCue]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-10 pointer-events-none flex items-end justify-center pb-24 transition-opacity duration-700 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ animation: fading ? undefined : 'groundedFadeIn 0.6s ease-out' }}
    >
      <div className="text-center">
        <span className="text-sm font-mono tracking-[0.25em] text-[#c792f5]/70">
          You are grounded here
        </span>
      </div>

      <style>{`
        @keyframes groundedFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default GroundedHint;
