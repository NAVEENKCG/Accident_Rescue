/**
 * Web Audio API — generates a short urgent beep without any audio files.
 * Falls back silently on browsers that block AudioContext.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  return ctx;
}

/** Play a short urgent alert tone (danger = two-tone siren, warning = single beep) */
export function playAlertBeep(severity: "warning" | "danger" = "danger"): void {
  const ac = getCtx();
  if (!ac) return;

  const now = ac.currentTime;

  if (severity === "danger") {
    // Two-tone siren: 880 Hz → 660 Hz, repeat twice
    [0, 0.25, 0.5, 0.75].forEach((offset, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(i % 2 === 0 ? 880 : 660, now + offset);
      gain.gain.setValueAtTime(0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.22);
      osc.start(now + offset);
      osc.stop(now + offset + 0.22);
    });
  } else {
    // Single soft beep at 520 Hz
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sine";
    osc.frequency.value = 520;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
  }
}
