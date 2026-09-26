/**
 * Simulated Camera Feed Generator
 * Generates an animated test video stream with real-time motion and depth,
 * allowing full testing of Smart HDR, Live Photos, and UI even when
 * no physical webcam is available or permissions are restricted.
 */

export function createSimulatedCameraStream() {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 960;
  const ctx = canvas.getContext('2d');

  let frame = 0;

  function draw() {
    frame++;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(0.5, '#0f172a');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    for (let x = 0; x < canvas.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Moving colorful spheres (simulating motion for Live Photos)
    const t = frame * 0.03;
    const colors = ['#FFD60A', '#FF453A', '#0A84FF', '#30D158', '#BF5AF2'];

    for (let i = 0; i < 5; i++) {
      const cx = canvas.width / 2 + Math.cos(t + i * 1.2) * (180 + i * 40);
      const cy = canvas.height / 2 + Math.sin(t * 1.3 + i * 0.9) * (140 + i * 30);
      const r = 50 + Math.sin(t + i) * 15;

      const sphereGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
      sphereGrad.addColorStop(0, '#ffffff');
      sphereGrad.addColorStop(0.3, colors[i]);
      sphereGrad.addColorStop(1, '#000000');

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.shadowColor = colors[i];
      ctx.shadowBlur = 25;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Central "Subject" (simulating a portrait subject)
    const subX = canvas.width / 2;
    const subY = canvas.height / 2 + Math.sin(t * 0.8) * 10;

    // Head
    ctx.beginPath();
    ctx.arc(subX, subY - 50, 70, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.ellipse(subX, subY + 90, 110, 70, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#64748b';
    ctx.fill();

    // Text info
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Cámara iPhone — Modo Simulado', canvas.width / 2, 80);

    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = '#FFD60A';
    ctx.fillText(`Fotograma en vivo #${frame} • Smart HDR 48MP Activo`, canvas.width / 2, 115);

    requestAnimationFrame(draw);
  }

  draw();

  const stream = canvas.captureStream(30);

  // Add dummy silent audio track so MediaRecorder doesn't complain about audio
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const dst = audioCtx.createMediaStreamDestination();
  osc.connect(dst);
  osc.start();
  const audioTrack = dst.stream.getAudioTracks()[0];
  if (audioTrack) {
    stream.addTrack(audioTrack);
  }

  return stream;
}
