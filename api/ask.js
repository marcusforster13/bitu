import { timingSafeEqual, createHash } from 'node:crypto';

export const config = { maxDuration: 60 };
const digest = value => createHash('sha256').update(value).digest();
export default async function handler(req, res) {
  const send = (status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(405, {error:'Use o formulário para perguntar.'}); }
  if (!process.env.OPENAI_API_KEY || !process.env.AI_ACCESS_CODE) return send(503, {error:'O Modo IA ainda está aguardando ativação pelo responsável pelo site.'});
  if (!timingSafeEqual(digest(String(req.headers['x-ai-code'] || '')), digest(process.env.AI_ACCESS_CODE))) return send(401, {error:'Código de acesso incorreto.'});
  let body;
  try {
    if (req.body !== undefined) body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    else {
      let raw = '';
      for await (const part of req) { raw += part; if (Buffer.byteLength(raw) > 8192) return send(413,{error:'Pergunta muito longa.'}); }
      body = JSON.parse(raw);
    }
  } catch { return send(400, {error:'Não foi possível ler a pergunta.'}); }
  if (typeof body?.question !== 'string' || !body.question.trim() || body.question.length > 1000) return send(400,{error:'Digite uma pergunta com até 1.000 caracteres.'});
  const call = (path, data) => fetch('https://api.openai.com/v1/' + path, {
    method:'POST', headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify(data), signal:AbortSignal.timeout(25000)
  });
  try {
    const response = await call('responses', {
      model:process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini', store:false, max_output_tokens:300,
      instructions:'Você é a coruja assistente virtual da XPTO. Responda em português brasileiro, com clareza e cordialidade, em até 100 palavras, sem markdown. Responda perguntas gerais. Não invente informações da XPTO: ainda não recebeu uma base de conhecimento da empresa. Diga quando não souber. Cada pergunta é independente. Não afirme ter pesquisado a internet ou executado ações.',
      input:body.question.trim()
    });
    if (!response.ok) return send(response.status === 429 ? 429 : 502,{error:'A IA está indisponível no momento. Tente novamente em instantes.'});
    const data = await response.json();
    const answer = (data.output || []).flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('\n').trim().slice(0,2000);
    if (!answer) return send(502,{error:'A IA não retornou uma resposta. Tente reformular a pergunta.'});
    try {
      const speech = await call('audio/speech',{model:'gpt-4o-mini-tts',voice:'coral',input:answer,response_format:'mp3',instructions:'Fale em português brasileiro, com tom acolhedor e ritmo natural.'});
      if (!speech.ok) throw Error('speech');
      const audio = Buffer.from(await speech.arrayBuffer());
      if (audio.length > 2500000) throw Error('size');
      return send(200,{answer,audio:audio.toString('base64')});
    } catch { return send(200,{answer,warning:'A resposta chegou, mas a voz está indisponível neste momento.'}); }
  } catch { return send(504,{error:'A resposta demorou demais. Tente novamente.'}); }
}
