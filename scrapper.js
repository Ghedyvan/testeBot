const puppeteer = require('puppeteer');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

async function obterJogosParaWhatsApp() {
  const url = 'https://trivela.com.br/onde-assistir/futebol-ao-vivo-os-jogos-de-hoje-na-tv/';
  const cacheFilePath = path.join(__dirname, 'jogos_hoje.json');
  const dataHoje = moment().tz('America/Sao_Paulo').format('DD/MM/YYYY');

  // Verifica se o cache existe e está atualizado
  if (fs.existsSync(cacheFilePath)) {
    try {
      const cacheContent = fs.readFileSync(cacheFilePath, 'utf-8');
      if (cacheContent.trim()) {
        const cacheData = JSON.parse(cacheContent);
        if (cacheData.data === dataHoje) {
          console.log('Usando dados do cache.');
          return cacheData.resposta;
        }
      }
    } catch (error) {
      console.error('Erro ao ler o cache. Recriando o arquivo...', error);
    }
  }

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const jogos = await page.evaluate(() => {
      const tabela = document.querySelector('figure:nth-of-type(1) table.large-only');
      if (!tabela) return [];

      const linhas = tabela.querySelectorAll('tbody tr');
      const dados = [];

      linhas.forEach((linha) => {
        const colunas = linha.querySelectorAll('td');
        if (colunas.length >= 4) {
          dados.push({
            horario: colunas[0].innerText.trim(),
            campeonato: colunas[1].innerText.trim(),
            jogo: colunas[2].innerText.trim(),
            transmissao: colunas[3].innerText.trim(),
          });
        }
      });

      return dados;
    });

    await browser.close();

    if (!jogos || jogos.length === 0) {
      return "⚠️ Nenhum jogo encontrado no momento.";
    }

    let resposta = `⚽ *Jogos de hoje (${dataHoje})*\n\n`;

    jogos.forEach((jogo) => {
      resposta += `*${jogo.jogo}*\n`;
      resposta += `⏰ ${jogo.horario} - 🏆 ${jogo.campeonato}\n`;
      resposta += `📺 ${jogo.transmissao}\n\n`;
    });

    resposta = resposta.trim();

    // Salva os dados no arquivo de cache
    fs.writeFileSync(
      cacheFilePath,
      JSON.stringify({ data: dataHoje, resposta }, null, 2),
      'utf-8'
    );

    return resposta;

  } catch (error) {
    await browser.close();
    console.error("Erro ao obter jogos:", error);
    return "⚠️ Ocorreu um erro ao buscar os jogos. Tente novamente mais tarde.";
  }
}

module.exports = { obterJogosParaWhatsApp };