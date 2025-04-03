const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Configuração do cliente
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

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
client.on('message', async msg => {
    const chat = await msg.getChat();
    const contact = await msg.getContact();
    const user = contact.pushname || contact.number;
    
    console.log(`Mensagem de ${user}: ${msg.body}`);

    // Respostas automáticas
    if (msg.body.toLowerCase() === 'oi' || msg.body.toLowerCase() === 'olá') {
        msg.reply(`Olá ${user}! Eu sou um bot. Como posso te ajudar?`);
    } 
    else if (msg.body.toLowerCase().includes('como você está')) {
        msg.reply('Estou ótimo, obrigado por perguntar! 😊');
    }
    else if (msg.body.toLowerCase().includes('horário')) {
        const now = new Date();
        msg.reply(`Agora são ${now.getHours()}h${now.getMinutes()}m`);
    }
    else if (msg.body.toLowerCase().includes('obrigado')) {
        msg.reply('De nada! Estou aqui para ajudar. 😊');
    }
    else {
        // Resposta padrão para mensagens não reconhecidas
        msg.reply('Desculpe, não entendi. Digite *ajuda* para ver os comandos disponíveis.');
    }
});

// Iniciar o cliente
client.initialize();