// Synthesizes a gentle, warm two-note morning chime using Web Audio API
export function playMorningChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes = [440, 554.37, 659.25]; // Warm A major triad (A4, C#5, E5)
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.11, now + idx * 0.16 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.16 + 1.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.16);
      osc.stop(now + idx * 0.16 + 1.15);
    });

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 2000);
  } catch {
    // Ignore if autoplay audio is blocked prior to user gesture
  }
}
