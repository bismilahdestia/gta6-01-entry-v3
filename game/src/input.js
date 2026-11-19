// Input: keyboard + mouse for desktop Chrome.
// WASD/arrows drive & walk, Shift runs on foot, E steals / gets
// out, mouse drag orbits the camera, click shoots, R reloads,
// Space is the handbrake, P or F pauses. Nothing here knows about
// the game — it only reports what the player is doing.
export function createInput(canvas) {
  const keys = new Set();
  const mouse = { dragging: false, dx: 0, dy: 0, clicked: false, lastX: 0, lastY: 0 };

  const CODE_TO_KEY = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'run', ShiftRight: 'run',
    Space: 'handbrake',
    KeyE: 'interact',
    KeyR: 'reload',
    KeyP: 'pause', KeyF: 'pause',
  };

  window.addEventListener('keydown', (e) => {
    // Ignore key auto-repeat: holding E or P must not toggle
    // steal / pause over and over.
    if (e.repeat) return;
    const k = CODE_TO_KEY[e.code];
    if (k) {
      keys.add(k);
      if (k === 'handbrake' || k === 'interact' || k === 'reload' || k === 'pause') e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = CODE_TO_KEY[e.code];
    if (k) keys.delete(k);
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (e) => {
    mouse.dragging = true;
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;
  });
  window.addEventListener('mouseup', (e) => {
    if (mouse.dragging) {
      const moved = Math.abs(e.clientX - mouse.lastX) + Math.abs(e.clientY - mouse.lastY);
      if (moved < 6) mouse.clicked = true; // a click, not a drag
    }
    mouse.dragging = false;
  });
  window.addEventListener('mousemove', (e) => {
    if (!mouse.dragging) return;
    mouse.dx += e.clientX - mouse.lastX;
    mouse.dy += e.clientY - mouse.lastY;
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Snapshot of the current frame's input, then clear the deltas.
  function read() {
    const snap = {
      forward: keys.has('up'),
      back: keys.has('down'),
      left: keys.has('left'),
      right: keys.has('right'),
      run: keys.has('run'),
      handbrake: keys.has('handbrake'),
      interact: keys.has('interact'),
      reload: keys.has('reload'),
      pause: keys.has('pause'),
      mouseDX: mouse.dx,
      mouseDY: mouse.dy,
      clicked: mouse.clicked,
    };
    mouse.dx = 0;
    mouse.dy = 0;
    mouse.clicked = false;
    return snap;
  }

  function consumePause() {
    const was = keys.has('pause');
    keys.delete('pause');
    return was;
  }

  function consumeInteract() {
    const was = keys.has('interact');
    keys.delete('interact');
    return was;
  }

  return { read, consumePause, consumeInteract, keys };
}
