# XPTO — Estúdio do mascote

Site estático em português com a coruja da XPTO animada pelo microfone. Usa as seis imagens fornecidas, sem serviços externos, dependências de produção ou gravação de áudio.

## Usar

1. Abra o site em HTTPS (ou localhost).
2. Clique em **Ligar microfone** e permita o acesso.
3. Escolha o microfone e ajuste a sensibilidade. O bico tem três posições conforme a intensidade do áudio; a piscada é independente.
4. Clique em **Modo de apresentação** para esconder os controles. Pressione Esc para voltar.
5. No Teams, compartilhe a janela do navegador e mantenha o microfone da reunião ligado. O Teams transmite a voz; este site apenas anima a coruja.

**Testar animação sem microfone** reproduz uma demonstração. Não representa uma captura real de áudio. O site não ouve automaticamente outros participantes do Teams, não transmite reuniões e não cria uma câmera virtual. Cada pessoa pode abrir o site no próprio computador para apresentar.

## Rodar localmente

Com Node.js instalado, execute `npm run dev` nesta pasta e abra http://localhost:4173. Para verificar a sintaxe, execute `npm run check`.

## Publicar na Vercel

Importe `marcusforster13/bitu` na Vercel. Use a raiz do repositório, preset **Other**, sem comando de build e com diretório de saída **.**. O `vercel.json` já define o site estático. Nenhuma variável de ambiente é necessária. Após conectar o repositório, novas alterações na branch de produção são publicadas pela integração da Vercel.

## Estrutura

- `index.html`: interface e instruções de apresentação.
- `styles.css`: layout responsivo e modo de apresentação.
- `app.js`: captura local com Web Audio, intensidade, transições da boca e piscadas.
- `assets/`: seis PNGs originais do mascote.
- `server.mjs`: servidor apenas para desenvolvimento local.

O áudio é analisado somente no navegador, sem ser gravado, reproduzido ou enviado pelo site. A animação segue a intensidade da voz, não identifica fonemas. As imagens são pré-carregadas antes de ativar os controles. Ruídos podem movimentar a boca; reduza a sensibilidade ou aproxime o microfone da voz.
