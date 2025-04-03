const { Client, LocalAuth } = require('whatsapp-web.js');
const { MessageMedia } = require("whatsapp-web.js");
const qrcode = require('qrcode-terminal');
const path = require("path");

const iptvstreamplayer = MessageMedia.fromFilePath("./streamplayer.png");
const ibo = MessageMedia.fromFilePath("./ibo.png");

// Configuração do cliente
const client = new Client({
    authStrategy: new LocalAuth(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--single-process',         // Reduz processos do Chromium
      '--no-zygote',
      '--disable-gpu',
      '--disable-dev-shm-usage',  // Evita usar /dev/shm (problemático em VPS)
      '--max-old-space-size=256'  // Limite de RAM para o Node.js (em MB)
    ],
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

const userSessions = new Map();

// Gerar QR Code para autenticação
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

// Confirmação de autenticação
client.on('authenticated', () => {
    console.log('Autenticado com sucesso!');
});

// Quando estiver pronto
client.on('ready', () => {
    console.log('Bot está pronto!');
});

// Ouvindo mensagens
client.on("message", async (msg) => {
    if (msg.from.endsWith("@g.us")) {
      return; // Ignora mensagens enviadas em grupos
    }
  
    const chatId = msg.from;
    const now = Date.now();
  
    if (
      !userSessions.has(chatId) ||
      now - userSessions.get(chatId).timestamp > 6 * 60 * 60 * 1000
    ) {
      userSessions.set(chatId, { step: "menu", timestamp: now, invalidCount: 0 });
      await msg.reply(
        "Bem-vindo de volta ao menu! Escolha uma opção:\n\n1️⃣ Quero um teste grátis\n2️⃣ Já sou cliente\n3️⃣ Preços e planos\n4️⃣ Como funciona"
      );
      return;
    }
  
    const session = userSessions.get(chatId);
  
    if (msg.body === "0") {
      session.step = "menu";
      session.invalidCount = 0;
      await msg.reply(
        "Bem-vindo de volta ao menu! Escolha uma opção:\n\n1️⃣ Quero um teste grátis\n2️⃣ Já sou cliente\n3️⃣ Preços e planos\n4️⃣ Como funciona"
      );
      return;
    }
  
    // Verifica se excedeu o limite de tentativas inválidas
    if (session.invalidCount >= 3) {
      return; // Não responde mais após 2 tentativas inválidas
    }
  
    if (session.step === "menu") {
      if (msg.body === "1") {
        session.step = "teste_gratis";
        session.invalidCount = 0;
        await msg.reply(
          "Em qual dispositivo gostaria de realizar o teste?\n\n1️⃣ Celular\n2️⃣ TV Box\n3️⃣ Smart TV\n4️⃣ Computador\n\n0️⃣ Menu inicial"
        );
      } else if (msg.body === "2") {
        session.step = "cliente";
        session.invalidCount = 0;
        await msg.reply(
          "Perfeito. Como posso te ajudar?\n\n1️⃣ Quero renovar acesso\n2️⃣ Quero reativar acesso vencido\n3️⃣ Estou com problemas\n4️⃣ Quero configurar um dispositivo\n\n0️⃣ Menu inicial"
        );
      } else if (msg.body === "3"){
        session.step = "planos";
        session.invalidCount = 0;
        await msg.reply(
          "📺 *PLANOS IPTV* 📺\n\n" +
          "💵 *1 MÊS* - R$ 20 (R$ 25 na primeira mensalidade)\n\n💰 *3 MESES* - R$ 55\n🔥 *6 MESES* - R$ 100\n(Apenas R$ 16,66/mês)\n🏆 *1 ANO* - R$ 180\n(Só R$ 15,00/mês)\n\n" +
          "💳 Aceitamos PIX, boleto e cartão de crédito\n\n1️⃣ Ativar acesso agora\n0️⃣ Menu inicial"
        );
      } else if (msg.body === "4"){
        session.step = "funcionamento";
        session.invalidCount = 0;
        await msg.reply(
          "📺 *O QUE VOCÊ RECEBE:*\n- +1.000 canais (Premiere, Telecine, SportTV etc)\n- +20.000 filmes (Netflix, HBO Max, Prime Video etc)\n- +7.000 séries(Netflix, HBO Max, Prime Video etc)\n\n⚙️ *COMO FUNCIONA:*\n1. Você assina o plano\n2. Recebe login/senha no WhatsApp\n3. Instala nosso app ou player compatível\n4. Aproveita a programação 24h\n\n0️⃣ Menu inicial"
        );
      } 
      
      else {
        session.invalidCount = (session.invalidCount || 0) + 1;
        if (session.invalidCount < 2) {
          await msg.reply(
            "Opção inválida! Escolha uma opção:\n\n1️⃣ Teste grátis\n2️⃣ Já sou cliente"
          );
        }
      }
    } else if (session.step === "planos") {
      if (msg.body === "1"){
        session.step = "ativar";
        session.invalidCount = 0;
        // await msg.reply(
        //   "Qual plano você deseja ativar?\n\n1️⃣ 1 MÊS - R$ 20 (R$ 25 na primeira mensalidade)\n2️⃣ 3 MESES - R$ 55\n3️⃣ 6 MESES - R$ 100\n4️⃣ 1 ANO - R$ 180\n\n0️⃣ Menu inicial"
        // );
        await msg.reply(
          "Perfeito, me fale qual plano gostaria de ativar e logo que ver a mensagem te responderei ok?\n\n0️⃣ Menu inicial"
        );
      }
    }
    
    else if (session.step === "teste_gratis" || session.step === "configurar") {
      if (msg.body === "1") {
        session.step = "celular";
        session.invalidCount = 0;
        await msg.reply(
          "Seu celular é:\n\n1️⃣ Android\n2️⃣ iPhone\n\n0️⃣ Menu inicial"
        );
      } else if (msg.body === "2") {
        session.step = "tvbox";
        session.invalidCount = 0;
        await client.sendMessage(msg.from, iptvstreamplayer, {
          caption:
            "✅ Siga os passos abaixo para configurar:\n\n" +
            "📲 Procura na PlayStore e baixa um aplicativo chamado *IPTV STREAM PLAYER*.\n\n" +
            "📌 Depois, pode abrir, irá aparecer uma tela com 3 botões, você seleciona o primeiro e ele irá te direcionar à página onde pede os dados de login.\n" +
            "🚀 Quando chegar nessa tela, me informe.",
        });
      } else if (msg.body === "3") {
        session.step = "smarttv";
        session.invalidCount = 0;
        await msg.reply(
          "Qual a marca da sua TV?\n\n1️⃣ LG\n2️⃣ Samsung\n3️⃣ Outra com Android\n4️⃣ Outra com Roku\n5️⃣ Não sei se é Roku ou Android\n\n0️⃣ Menu inicial"
        );
      } else if (msg.body === "4") {
        session.invalidCount = 0;
        await msg.reply(
          "🌐 Acesse: applime.cc/w\n" +
          "👤 Use seus dados de login\n\n" +
          "📩 Esqueceu ou ainda não RECEBEU os dados? Me informa aqui!"
        );
      } else {
        session.invalidCount = (session.invalidCount || 0) + 1;
        if (session.invalidCount < 2) {
          await msg.reply(
            "Escolha um dispositivo válido:\n\n1️⃣ Celular\n2️⃣ TV Box\n3️⃣ Smart TV\n4️⃣ Computador\n\n0️⃣ Menu inicial"
          );
        }
      }
    } else if (session.step === "celular") {
      if (msg.body === "1") {
        session.step = "android";
        session.invalidCount = 0;
        await client.sendMessage(msg.from, iptvstreamplayer, {
          caption:
            "✅ Siga os passos abaixo para configurar:\n\n" +
            "📲 Procura na PlayStore e baixa um aplicativo chamado *IPTV STREAM PLAYER*.\n\n" +
            "📌 Depois, pode abrir, irá aparecer uma tela com 3 botões, você seleciona o primeiro e ele irá te direcionar à página onde pede os dados de login.\n" +
            "🚀 Quando chegar nessa tela, me informe.",
        });
      } else if (msg.body === "2") {
        session.step = "iphone";
        session.invalidCount = 0;
        await msg.reply(
          "✅ Siga os passos abaixo para configurar:\n\n" +
          "1. Baixe o *Smarters Player Lite* na AppStore\n" +
          "2. Abra o app e aceite os termos (Se ele pedir)\n" +
          "3. Selecione *Xtreme Codes* na tela\n\n" +
          "🔑 Quando chegar na tela de login, me avise que te envio seus dados!"
        );
      } else {
        session.invalidCount = (session.invalidCount || 0) + 1;
        if (session.invalidCount < 2) {
          await msg.reply(
            "Escolha uma opção válida:\n\n1️⃣ Android\n2️⃣ iPhone\n\n0️⃣ Menu inicial"
          );
        }
      }
    } else if (session.step === "smarttv") {
      if (msg.body === "1") {
        session.step = "lg";
        session.invalidCount = 0;
        await msg.reply(
          "✅ Siga os passos abaixo para configurar:\n\n" +
          "▸ Abra a loja de apps da TV (*APP* ou *LG Content Store*)\n" +
          "▸ Instale o *IPTVSmartersPRO*\n" +
          "▸ Abra o app > aceite os termos\n\n" +
          "📩 Quando chegar na tela de login, me avise que te envio seus dados!"
        );
      } else if (msg.body === "2") {
        session.step = "samsung";
        session.invalidCount = 0;
        await msg.reply(
          "✅ Siga os passos abaixo para configurar:\n\n" +
          "▪ Abra a *Loja Samsung* e instale o *SmartUp*\n" +
          "▪ Acesse: Configurações > Geral > Rede > Status > Config. IP\n" +
          "▪ Altere o DNS para *Manual*\n" +
          "▪ Insira: `168.235.81.205` e salve\n" +
          "▪ Reinicie a TV e abra o SmartUp\n\n" +
          "📸 Prontinho! Me envie uma foto da tela que te mando seus dados de acesso.\n\n" +
          "⚠️ *Obs:* Se não encontrar o SmartUp, me avise que te ajudo a baixar outro app."
        );
      } else if (msg.body === "3") {
        session.step = "android";
        session.invalidCount = 0;
        await client.sendMessage(msg.from, iptvstreamplayer, {
          caption:
            "✅ Siga os passos abaixo para configurar:\n\n" +
            "📲 Procura na PlayStore e baixa um aplicativo chamado *IPTV STREAM PLAYER*.\n\n" +
            "📌 Depois, pode abrir, irá aparecer uma tela com 3 botões, você seleciona o primeiro e ele irá te direcionar à página onde pede os dados de login.\n" +
            "🚀 Quando chegar nessa tela, me informe.",
        });
      } else if (msg.body === "4") {
        session.step = "roku";
        session.invalidCount = 0;
        await client.sendMessage(msg.from, ibo, {
          caption:
            "✅ Siga os passos abaixo para configurar:\n\n" +
            "1️⃣ *Abra* a loja de aplicativos da sua TV\n" +
            "2️⃣ *Procure* pelo aplicativo *IBO PRO* e instale\n" +
            "3️⃣ *Abra* o aplicativo e selecione a opção *CHANGE PLAYLIST*\n" +
            "4️⃣ *Me envie* uma foto dos códigos que serão mostrados no lado direito da tela para que eu possa configurar para você\n\n" +
            "⚠️ *Obs:* Todos os apps da TV Roku têm uma tarifa anual de *30 reais* (paga apenas 1x por ano).",
        });
      } else if (msg.body === "5") {
        session.step = "outro";
        session.invalidCount = 0;
        await msg.reply(
          "📱 Abre a loja de aplicativos e me manda uma foto da tela, por favor!"
        );
      } else {
        session.invalidCount = (session.invalidCount || 0) + 1;
        if (session.invalidCount < 2) {
          await msg.reply(
            "Qual a marca da sua TV?\n\n1️⃣ LG\n2️⃣ Samsung\n3️⃣ Outra com Android\n4️⃣ Outra com Roku\n5️⃣ Não sei se é Roku ou Android\n\n0️⃣ Menu inicial"
          );
        }
      }
    } else if (session.step === "cliente") {
      if (msg.body === "1") {
        session.step = "renovar";
        session.invalidCount = 0;
        await msg.reply(
          "💳 Se você já recebeu o link do InfinitePay, pode pagar por lá, tranquilo? Se não chegou, é só me avisar que eu te envio o link com todo prazer!"
        );
      } else if (msg.body === "2") {
        session.step = "reativar";
        session.invalidCount = 0;
        await msg.reply(
          "📝 A reativação de acesso vencido tem taxa de R$5 (total: R$25). Caso tenha recebido o link do InfinitePay, pode pagar normalmente nele. Se não, me informa para te enviar ele ok"
        );
      } else if (msg.body === "3") {
        session.step = "problema";
        session.invalidCount = 0;
        await msg.reply(
          "💬 Me conta mais detalhes ou envia uma foto do erro, se tiver!"
        );
      } else if (msg.body === "4") {
        session.step = "configurar";
        session.invalidCount = 0;
        await msg.reply(
          "Em qual dispositivo gostaria de configurar agora?\n\n1️⃣ Celular\n2️⃣ TV Box\n3️⃣ Smart TV\n4️⃣ Computador\n\n0️⃣ Menu inicial"
        );
      } else {
        session.invalidCount = (session.invalidCount || 0) + 1;
        if (session.invalidCount < 2) {
          await msg.reply(
            "Perfeito. Como posso te ajudar?\n\n1️⃣ Quero renovar acesso\n2️⃣ Quero reativar acesso vencido\n3️⃣ Estou com problemas\n4️⃣ Quero configurar um dispositivo\n\n0️⃣ Menu inicial"
          );
        }
      }
    }
  });

// Iniciar o cliente
client.initialize();
