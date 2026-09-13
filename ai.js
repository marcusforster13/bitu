(() => {
  const el = id => document.getElementById(id);
  const audio = el('aiAudio');
  let context, analyser, samples, source, url, controller, generation = 0, active = false;
  function stop() {
    generation++; controller?.abort(); controller = null; audio.pause(); active = false;
    el('aiSend').disabled = false; el('aiStop').disabled = true;
    if (el('aiMessage').textContent === 'Preparando resposta…') el('aiMessage').textContent = 'Pedido cancelado.';
  }
  window.xptoAI = {
    stop,
    get active() { return active; },
    level() {
      if (!active || !analyser) return 0;
      analyser.getFloatTimeDomainData(samples);
      let sum = 0; for (const sample of samples) sum += sample * sample;
      return Math.max(0,Math.min(1,(Math.sqrt(sum / samples.length)-.008)*5));
    }
  };
  function graph() {
    if (!context) {
      context = new AudioContext(); analyser = context.createAnalyser(); analyser.fftSize = 1024;
      samples = new Float32Array(analyser.fftSize); source = context.createMediaElementSource(audio);
      source.connect(analyser); analyser.connect(context.destination);
    }
    return context.resume();
  }
  async function play() {
    const request = generation;
    window.dispatchEvent(new Event('xpto-ai-play'));
    try { await graph(); if (request !== generation) return; await audio.play(); if (request !== generation) { audio.pause(); return; } el('aiStop').disabled = false; }
    catch { el('aiMessage').textContent = 'Clique em Ouvir resposta para liberar o áudio.'; }
  }
  audio.addEventListener('playing', () => { active = true; });
  for (const event of ['pause','ended','waiting','error']) audio.addEventListener(event, () => { active = false; });
  audio.addEventListener('ended', () => { el('aiStop').disabled = true; });
  el('aiStop').addEventListener('click', stop);
  el('aiReplay').addEventListener('click', () => { audio.currentTime = 0; play(); });
  el('aiForm').addEventListener('submit', async event => {
    event.preventDefault(); stop(); const request = generation;
    el('aiAnswer').textContent = ''; el('aiReplay').disabled = true;
    if (url) { URL.revokeObjectURL(url); url = undefined; }
    el('aiMessage').textContent = 'Preparando resposta…'; el('aiSend').disabled = true; el('aiStop').disabled = false;
    controller = new AbortController(); const timer = setTimeout(() => controller?.abort(),55000);
    try {
      // Unlock playback within the user's click, while the server prepares the answer.
      await graph();
      if (request !== generation) return;
      const response = await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json','X-AI-Code':el('aiCode').value},body:JSON.stringify({question:el('aiQuestion').value}),signal:controller.signal});
      const data = await response.json();
      if (request !== generation) return;
      if (!response.ok) throw Error(data.error || 'Não foi possível responder agora.');
      el('aiAnswer').textContent = data.answer;
      el('aiMessage').textContent = data.warning || 'Resposta pronta.';
      if (data.audio) {
        const bytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
        url = URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'})); audio.src = url;
        el('aiReplay').disabled = false; await play();
      }
    } catch (error) {
      if (request === generation) el('aiMessage').textContent = error.name === 'AbortError' ? 'A resposta demorou demais. Tente novamente.' : error.message;
    } finally {
      clearTimeout(timer);
      if (request === generation) { controller = null; el('aiSend').disabled = false; el('aiStop').disabled = audio.paused; }
    }
  });
  window.addEventListener('pagehide', () => { stop(); if (url) URL.revokeObjectURL(url); context?.suspend(); });
})();
