const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment');

// URL da página da Trivela com os jogos de hoje
const URL = 'https://trivela.com.br/onde-assistir/futebol-ao-vivo-os-jogos-de-hoje-na-tv/';

async function obterJogosDeHoje() {
  try {
    console.log('🔍 Iniciando busca por jogos no Trivela...');
    
    // Configuração do axios para evitar bloqueio
    const { data } = await axios.get(URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 10000
    });

    const $ = cheerio.load(data);
    const hoje = moment().format('DD/MM/YYYY');
    const jogos = [];

    // Versão robusta para encontrar a tabela
    const tabela = $('table').first();
    
    if (!tabela.length) {
      console.log('⚠️ Tabela não encontrada. Tentando método alternativo...');
      
      // Método alternativo para sites que não usam tabelas
      $('.jogo, .partida').each((index, element) => {
        const horario = $(element).find('.horario, .time').text().trim();
        const times = $(element).find('.times, .teams').text().trim().split(' x ');
        const campeonato = $(element).find('.campeonato, .league').text().trim() || 'Não especificado';
        const transmissao = $(element).find('.canais, .channels').text().trim();
        
        if (times.length === 2) {
          jogos.push({
            data: hoje,
            horario,
            campeonato,
            mandante: times[0],
            visitante: times[1],
            transmissao: transmissao.split(',').map(t => t.trim())
          });
        }
      });
      
      if (jogos.length === 0) {
        throw new Error('Não foi possível encontrar os jogos na página');
      }
    } else {
      console.log('✅ Tabela de jogos encontrada. Extraindo dados...');
      
      // Processamento da tabela
      tabela.find('tr').each((index, row) => {
        if (index === 0) return; // Pula cabeçalho
        
        const cols = $(row).find('td');
        if (cols.length >= 4) {
          const horario = $(cols[0]).text().trim();
          const campeonato = $(cols[1]).text().trim();
          const jogo = $(cols[2]).text().trim();
          const transmissao = $(cols[3]).text().trim();
          
          // Separa os times (formato "Time A x Time B")
          const times = jogo.split(' x ').map(t => t.trim());
          
          if (times.length === 2) {
            jogos.push({
              data: hoje,
              horario,
              campeonato,
              mandante: times[0],
              visitante: times[1],
              transmissao: transmissao.split(',').map(t => t.trim()),
              status: horario.toLowerCase().includes('agora') ? 'AO VIVO' : 'AGENDADO'
            });
          }
        }
      });
    }

    // Saída formatada
    console.log(`\n📅 JOGOS DE FUTEBOL - ${hoje}`);
    console.log('============================================');
    
    if (jogos.length === 0) {
      console.log('ℹ️ Nenhum jogo encontrado para hoje.');
    } else {
      jogos.forEach((jogo, index) => {
        console.log(`\n⚽ JOGO ${index + 1}: ${jogo.mandante} vs ${jogo.visitante}`);
        console.log(`⏰ ${jogo.horario} | 🏆 ${jogo.campeonato}`);
        console.log(`📡 TRANSMISSÃO: ${jogo.transmissao.join(', ')}`);
        console.log(`🟢 STATUS: ${jogo.status}`);
      });
      
      console.log(`\n✅ Total de jogos encontrados: ${jogos.length}`);
    }

    return jogos;

  } catch (erro) {
    console.error('\n❌ Erro ao obter os jogos:', erro.message);
    console.log('\nSugestões:');
    console.log('1. Verifique se o site está acessível manualmente');
    console.log('2. A estrutura do site pode ter mudado - precisamos atualizar os seletores');
    console.log('3. Tente acessar com VPN caso esteja sendo bloqueado');
    
    return [];
  }
}

// Execução e salvamento em arquivo
(async () => {
  const jogos = await obterJogosDeHoje();
  
  if (jogos.length > 0) {
    const fs = require('fs');
    fs.writeFileSync('jogos-trivela.json', JSON.stringify(jogos, null, 2));
    console.log('\n💾 Dados salvos em jogos-trivela.json');
  }
})();