# Ativar o Modo IA

A implementação está preparada para Vercel Functions em `api/ask.js`.
Configure nas variáveis de ambiente do projeto Vercel:

- `OPENAI_API_KEY`: chave de um projeto OpenAI com acesso e saldo para a API.
- `AI_ACCESS_CODE`: código longo e imprevisível compartilhado somente com os apresentadores. Não é a chave OpenAI.
- `OPENAI_TEXT_MODEL`: opcional; padrão `gpt-4o-mini`.

Depois publique novamente. Nunca coloque a chave no HTML, no Git ou no campo de código do site. O endpoint permanece inativo enquanto faltar configuração.

Esta primeira versão é para um grupo controlado de apresentadores. Não divulgue o código publicamente. Antes de liberar para um público amplo, adicione autenticação individual e limite persistente de requisições. O limite de texto por pedido não é um limite global de gastos.

As perguntas são independentes, enviadas à OpenAI, sem banco de conversas no aplicativo. A chamada Responses usa `store: false`; isso não substitui as políticas de retenção do provedor. A voz usa `gpt-4o-mini-tts` e não imita a voz da locução oficial. Sem base da empresa, a IA não deve inventar fatos sobre a XPTO.

Para teste local, defina as variáveis no ambiente do processo e rode `npm run dev`. Sem chave, é possível testar a interface e a mensagem de configuração pendente.

Documentação: https://developers.openai.com/api/docs/guides/text e https://developers.openai.com/api/docs/guides/text-to-speech
