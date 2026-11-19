// Sound, synthesized with WebAudio — no audio files.
// Engine hum follows speed, the siren wails while wanted, and
// gunshots, blips and pickups are short envelopes. The context is
// created lazily on the first user gesture (start click), so the
// browser's autoplay rules never block the game.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenOn = false;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      // Engine: a low sawtooth through a low-pass, pitch by speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // Siren: a sine that sweeps between two tones.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 750;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function setEngine(speed01) {
    if (!ctx || !engineOsc) return;
    const t = ctx.currentTime;
    engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, t, 0.1);
    engineGain.gain.setTargetAtTime(0.05 + speed01 * 0.1, t, 0.1);
  }

  function setSiren(on) {
    if (!ctx) return;
    if (on === sirenOn) return;
    sirenOn = on;
    const t = ctx.currentTime;
    if (on) {
      sirenGain.gain.setTargetAtTime(0.06, t, 0.2);
      // Two-tone wail: alternate 750 / 1050 Hz every 0.45 s.
      const wail = () => {
        if (!sirenOn || !ctx) return;
        sirenOsc.frequency.setTargetAtTime(
          sirenOsc.frequency.value < 900 ? 1050 : 750, ctx.currentTime, 0.05,
        );
        setTimeout(wail, 450);
      };
      wail();
    } else {
      sirenGain.gain.setTargetAtTime(0, t, 0.2);
    }
  }

  function blip(freq = 880, dur = 0.09, vol = 0.2) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur);
  }

  function gunshot() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.14);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t);
  }

  function pickup() {
    blip(660, 0.08, 0.18);
    setTimeout(() => blip(990, 0.12, 0.18), 90);
  }

  return { ensure, resume, setEngine, setSiren, blip, gunshot, pickup };
}
