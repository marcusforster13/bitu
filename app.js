const $ = (id) => document.getElementById(id);
const mouths = ['closed', 'medium', 'wide'];
const poses = new Map();
let mouth = 0, blinking = false, micActive = false, demoActive = false, micPending = false;
let context, stream, source, analyser, frame, samples, blinkTimer, blinkEnd;
let envelope = 0, lastMouthAt = 0, demoStarted = 0, operation = 0;
let meterAt = 0, currentPose = '', presenting = false;
const bars = Array.from({length: 25}, () => $('meter').appendChild(document.createElement('i')));
const logos = {
  operational: {src: 'assets/logo-operational.png', label: 'Operational Intelligence'},
  xpto: {src: 'assets/logo-xpto.png', label: 'XPTO'}
};
let logoRequest = 0;
function positionLogo() {
  // Follow the original object-fit image rectangle without resizing or moving it.
  const frame = $('mascot');
  const width = Math.min(frame.clientWidth, frame.clientHeight * 1079 / 1457);
  const height = width * 1457 / 1079;
  const logo = $('chestLogo');
  logo.style.left = `${(frame.clientWidth - width) / 2 + width * .322}px`;
  logo.style.top = `${(frame.clientHeight - height) / 2 + height * (logo.dataset.logo === 'xpto' ? .477 : .46)}px`;
  logo.style.width = `${width * .355}px`;
}
new ResizeObserver(positionLogo).observe($('mascot'));
async function chooseLogo() {
  const request = ++logoRequest;
  const choice = $('logoChoice').value;
  const logo = logos[choice];
  $('chestLogo').hidden = true;
  $('mascot').setAttribute('aria-label', 'Coruja robótica, mascote da XPTO, sem logo');
  try { localStorage.setItem('xpto-clothing-logo', logo ? choice : 'none'); } catch {}
  if (!logo) return;
  $('clothingLogo').src = logo.src;
  try {
    await $('clothingLogo').decode();
    if (request !== logoRequest) return;
    $('chestLogo').dataset.logo = choice;
    positionLogo();
    $('chestLogo').hidden = false;
    $('mascot').setAttribute('aria-label', `Coruja robótica, mascote da XPTO, com logo ${logo.label} na roupa`);
  } catch {
    if (request === logoRequest) message('Não foi possível carregar esse logo. Selecione novamente para tentar.', true);
  }
}
$('logoChoice').addEventListener('change', chooseLogo);
try {
  const savedLogo = localStorage.getItem('xpto-clothing-logo');
  if (logos[savedLogo]) $('logoChoice').value = savedLogo;
} catch {}
chooseLogo();

function message(text = '', error = false) {
  $('message').textContent = text;
  $('message').classList.toggle('error', error);
}
function draw() {
  const key = `${blinking ? 'blink' : 'open'}-${mouths[mouth]}`;
  if (key === currentPose) return;
  poses.get(currentPose)?.classList.remove('active');
  poses.get(key)?.classList.add('active');
  currentPose = key;
}
function setMeter(level) {
  const value = Math.max(0, Math.min(100, Math.round(level * 100)));
  bars.forEach((bar, index) => bar.classList.toggle('lit', index < value / 4));
  $('meter').setAttribute('aria-valuenow', String(value));
}
function status() {
  $('stageStatus').textContent = micActive ? 'Microfone ligado' : demoActive ? 'Demonstração' : 'Pronta para dar voz';
  $('statusDot').className = `status-dot${micActive ? ' live' : demoActive ? ' demo' : ''}`;
  $('micButton').querySelector('span').textContent = micActive ? 'Desligar microfone' : 'Ligar microfone';
  $('micButton').classList.toggle('recording', micActive);
  $('micButton').setAttribute('aria-pressed', String(micActive));
  $('demoButton').querySelector('span').textContent = demoActive ? 'Parar demonstração' : 'Testar animação sem microfone';
  $('demoButton').setAttribute('aria-pressed', String(demoActive));
  $('inputStatus').textContent = micActive ? 'Ouvindo' : demoActive ? 'Simulação' : 'Desligado';
}
function scheduleBlink() {
  clearTimeout(blinkTimer); clearTimeout(blinkEnd);
  blinking = false; draw();
  if (!$('blink').checked) return;
  blinkTimer = setTimeout(() => {
    blinking = true; draw();
    blinkEnd = setTimeout(() => { blinking = false; draw(); scheduleBlink(); }, 130 + Math.random() * 50);
  }, 2500 + Math.random() * 3400);
}
function tick(now) {
  let level = 0;
  if (micActive && analyser) {
    analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (const sample of samples) sum += sample * sample;
    const rms = Math.sqrt(sum / samples.length);
    const sensitivity = Number($('sensitivity').value) / 100;
    const floor = .012 - sensitivity * .010;
    const gain = 3 + sensitivity * 22;
    level = Math.max(0, Math.min(1, (rms - floor) * gain));
  } else if (demoActive) {
    const t = (now - demoStarted) / 1000;
    level = t % 4.7 > 3.5 ? 0 : Math.max(0, .42 + .3 * Math.sin(t * 14) + .18 * Math.sin(t * 29));
  }
  // Quick attack, slower release; hysteresis prevents chatter around thresholds.
  envelope += (level - envelope) * (level > envelope ? .65 : .28);
  let next = mouth;
  if (mouth === 0) next = envelope > .10 ? (envelope > .42 ? 2 : 1) : 0;
  else if (mouth === 1) next = envelope < .065 ? 0 : envelope > .42 ? 2 : 1;
  else next = envelope < .065 ? 0 : envelope < .30 ? 1 : 2;
  if (now - lastMouthAt > 65 && next !== mouth) { mouth = next; lastMouthAt = now; draw(); }
  if (now - meterAt > 65) { setMeter(envelope); meterAt = now; }
  frame = requestAnimationFrame(tick);
}
async function releaseAudio() {
  micActive = false;
  const oldStream = stream, oldContext = context;
  stream = context = analyser = samples = undefined;
  source?.disconnect(); source = undefined;
  oldStream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
  envelope = 0; mouth = 0; setMeter(0); draw(); status();
  if (oldContext && oldContext.state !== 'closed') await oldContext.close().catch(() => {});
}
async function listDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  const selected = $('device').value;
  try {
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput');
    $('device').replaceChildren(new Option('Padrão do sistema', ''));
    devices.filter(d => d.deviceId && d.deviceId !== 'default').forEach((d, i) => $('device').add(new Option(d.label || `Microfone ${i + 1}`, d.deviceId)));
    if (Array.from($('device').options).some(o => o.value === selected)) $('device').value = selected;
  } catch { /* The default input remains available if device enumeration is restricted. */ }
}
async function startMic() {
  if (!navigator.mediaDevices?.getUserMedia) {
    message('Abra o site por HTTPS ou em localhost para permitir o microfone.', true); return;
  }
  const request = ++operation;
  demoActive = false;
  micPending = true;
  $('device').disabled = true; $('demoButton').disabled = true;
  message('Aguardando sua permissão para usar o microfone…');
  await releaseAudio();
  $('micButton').querySelector('span').textContent = 'Cancelar ativação';
  let pendingStream, pendingContext;
  try {
    pendingStream = await navigator.mediaDevices.getUserMedia({audio: {
      deviceId: $('device').value ? {exact: $('device').value} : undefined,
      echoCancellation: true, noiseSuppression: true, autoGainControl: true
    }, video: false});
    if (request !== operation) { pendingStream.getTracks().forEach(t => t.stop()); return; }
    pendingContext = new AudioContext();
    await pendingContext.resume();
    if (request !== operation) { pendingStream.getTracks().forEach(t => t.stop()); await pendingContext.close(); return; }
    context = pendingContext; stream = pendingStream;
    analyser = context.createAnalyser(); analyser.fftSize = 1024;
    source = context.createMediaStreamSource(stream); source.connect(analyser);
    // No speaker connection: the site analyzes the input without audio feedback.
    samples = new Float32Array(analyser.fftSize);
    micActive = true;
    stream.getAudioTracks().forEach(track => track.onended = async () => {
      ++operation; await releaseAudio(); message('O microfone foi desconectado. Selecione uma entrada e ligue novamente.', true); await listDevices();
    });
    await listDevices(); status(); message('Pode falar. Ajuste a sensibilidade se precisar.');
  } catch (error) {
    pendingStream?.getTracks().forEach(t => t.stop());
    if (pendingContext && pendingContext !== context) await pendingContext.close().catch(() => {});
    if (request !== operation) return;
    await releaseAudio();
    const errors = {
      NotAllowedError: 'Acesso ao microfone negado. Permita o microfone nas configurações deste site e tente novamente.',
      NotFoundError: 'Nenhum microfone encontrado. Conecte um microfone e tente novamente.',
      NotReadableError: 'Não foi possível abrir o microfone. Verifique se outro aplicativo está usando a entrada de forma exclusiva.',
      OverconstrainedError: 'Esse microfone não está disponível. Selecione outra entrada.'
    };
    message(errors[error.name] || 'Não foi possível ligar o microfone. Confira a entrada de áudio e tente novamente.', true);
  } finally {
    if (request === operation) { micPending = false; $('micButton').disabled = false; $('device').disabled = false; $('demoButton').disabled = false; status(); }
  }
}
function endPresentation() {
  presenting = false; document.body.classList.remove('presenting');
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  $('presentButton').focus();
}
function present() {
  presenting = true; document.body.classList.add('presenting');
  $('exitPresentation').focus({preventScroll:true});
  document.documentElement.requestFullscreen?.().catch(() => {});
}
$('micButton').addEventListener('click', async () => {
  if (micPending || micActive) {
    ++operation; micPending = false; await releaseAudio();
    $('device').disabled = $('demoButton').disabled = false; message();
  } else await startMic();
});
$('device').addEventListener('change', () => { if (micActive) startMic(); });
$('sensitivity').addEventListener('input', () => { $('sensitivityValue').textContent = `${$('sensitivity').value}%`; });
$('blink').addEventListener('change', scheduleBlink);
$('demoButton').addEventListener('click', async () => {
  ++operation; await releaseAudio(); demoActive = !demoActive; demoStarted = performance.now(); status();
  message(demoActive ? 'Demonstração em andamento. Ligue o microfone para usar sua voz.' : '');
});
$('presentButton').addEventListener('click', present);
$('stageExpand').addEventListener('click', present);
$('exitPresentation').addEventListener('click', endPresentation);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && presenting) endPresentation(); });
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && presenting) endPresentation(); });
$('helpButton').addEventListener('click', () => $('helpDialog').showModal());
for (const id of ['closeHelp', 'understood']) $(id).addEventListener('click', () => $('helpDialog').close());
navigator.mediaDevices?.addEventListener('devicechange', listDevices);
window.addEventListener('pagehide', () => { ++operation; cancelAnimationFrame(frame); clearTimeout(blinkTimer); clearTimeout(blinkEnd); releaseAudio(); });
window.addEventListener('pageshow', e => { if (e.persisted) { scheduleBlink(); frame = requestAnimationFrame(tick); } });
async function init() {
  try {
    await Promise.all(['open', 'blink'].flatMap(eyes => mouths.map(async pose => {
      const key = `${eyes}-${pose}`;
      let img = document.querySelector(`[data-pose="${key}"]`);
      if (!img) { img = new Image(); img.src = `assets/${key}.png`; img.className = 'pose'; img.alt = ''; img.setAttribute('aria-hidden','true'); img.dataset.pose = key; $('mascot').append(img); }
      poses.set(key, img); await img.decode();
    })));
    draw(); status(); scheduleBlink(); frame = requestAnimationFrame(tick);
    $('micButton').disabled = $('demoButton').disabled = false;
    await listDevices();
  } catch {
    $('stageStatus').textContent = 'Falha ao carregar imagens';
    message('Uma imagem da coruja não carregou. Atualize a página para tentar novamente.', true);
  }
}
init();
