const OpenAI = require('openai');

// Inicializar cliente Groq (usa API compatível com OpenAI)
let groq = null;

if (process.env.GROQ_API_KEY) {
  groq = new OpenAI({ 
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
  });
  console.log('🚀 Groq IA configurado (Llama 3.3 70B - gratuito!)');
} else {
  console.log('⚠️ GROQ_API_KEY não configurada. IA desativada.');
}

// Verificar se IA está disponível
const getProvider = () => {
  if (process.env.DISABLE_AI === 'true') return null;
  if (groq) return 'groq';
  return null;
};

/**
 * Gera texto usando Groq (Llama 3.3 70B)
 */
const gerarTexto = async (prompt, systemPrompt = '') => {
  if (!groq) {
    console.log('⚠️ IA não configurada');
    return null;
  }

  if (process.env.DISABLE_AI === 'true') {
    return null;
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });
    return completion.choices[0]?.message?.content;
  } catch (error) {
    console.error('Erro Groq:', error.message);
    throw error;
  }
};

/**
 * Gera análise financeira personalizada
 */
const gerarAnaliseFinanceira = async (dados, tipo = 'geral') => {
  try {
    if (!getProvider()) {
      return null;
    }

    const systemPrompt = `Você é um consultor financeiro pessoal especializado em finanças pessoais e produtividade. 
Analise os dados do usuário e forneça insights personalizados, práticos e motivacionais.
Seja direto, use linguagem simples e amigável. Limite sua resposta a 3-4 parágrafos curtos.
Use emojis moderadamente para tornar a leitura agradável.
Moeda: MZN (Meticais moçambicanos).
IMPORTANTE: Não use formatação markdown como ** ou #. Use apenas texto simples.`;

    let prompt = '';
    
    switch (tipo) {
      case 'geral':
        prompt = `Dados do usuário este mês:
- Entradas (receitas): MZN ${dados.entradas?.toFixed(2) || 0}
- Gastos totais: MZN ${dados.gastos?.toFixed(2) || 0}
- Balanço: MZN ${dados.balanco?.toFixed(2) || 0}
- Taxa de poupança: ${dados.taxaPoupanca?.toFixed(1) || 0}%
- Score financeiro: ${dados.score || 0}/100
- Atividades concluídas: ${dados.atividadesConcluidas || 0}/${dados.atividadesTotal || 0}
- Metas concluídas: ${dados.metasConcluidas || 0}/${dados.metasTotal || 0}

Faça uma análise geral da saúde financeira e produtividade do usuário, destacando pontos positivos e áreas de melhoria.`;
        break;

      case 'financeiro':
        prompt = `Dados financeiros detalhados:
- Gastos este mês: MZN ${dados.gastosMes?.toFixed(2) || 0}
- Gastos mês anterior: MZN ${dados.gastosMesAnterior?.toFixed(2) || 0}
- Tendência: ${dados.tendenciaGastos?.toFixed(1) || 0}%
- Média diária de gastos: MZN ${dados.mediaDiaria?.toFixed(2) || 0}
- Projeção para fim do mês: MZN ${dados.projecaoMes?.toFixed(2) || 0}
- Entradas: MZN ${dados.entradasMes?.toFixed(2) || 0}
- Taxa de poupança: ${dados.taxaPoupanca?.toFixed(1) || 0}%

Top categorias de gastos:
${dados.categorias?.map((c, i) => `${i + 1}. ${c.nome}: MZN ${c.total?.toFixed(2)} (${c.percentual?.toFixed(1)}%)`).join('\n') || 'Sem dados'}

Analise o padrão de gastos, identifique onde pode economizar e dê dicas práticas.`;
        break;

      case 'produtividade':
        prompt = `Dados de produtividade:
- Total de atividades: ${dados.atividadesTotal || 0}
- Realizadas: ${dados.atividadesRealizadas || 0}
- Pendentes: ${dados.atividadesPendentes || 0}
- Em andamento: ${dados.atividadesEmAndamento || 0}
- Taxa de conclusão: ${dados.taxaConclusao?.toFixed(1) || 0}%
- Tendência vs mês anterior: ${dados.tendencia?.toFixed(1) || 0}%

Analise a produtividade e sugira formas de melhorar a consistência.`;
        break;

      case 'metas':
        prompt = `Dados de metas:
- Total de metas: ${dados.total || 0}
- Concluídas: ${dados.concluidas || 0}
- Em andamento: ${dados.emAndamento || 0}
- Pendentes: ${dados.pendentes || 0}
- Atrasadas: ${dados.atrasadas || 0}
- Taxa de conclusão: ${dados.taxaConclusao?.toFixed(1) || 0}%
- Metas vencendo esta semana: ${dados.proximasSemana || 0}

Analise o progresso das metas, alerte sobre prazos e motive o usuário.`;
        break;
    }

    return await gerarTexto(prompt, systemPrompt);
  } catch (error) {
    console.error('Erro ao gerar análise:', error.message);
    return null;
  }
};

/**
 * Gera dica personalizada do dia
 */
const gerarDicaDoDia = async (dados) => {
  try {
    if (!getProvider()) {
      return null;
    }

    const prompt = `Com base nestes dados financeiros:
- Balanço do mês: MZN ${dados.balanco?.toFixed(2) || 0}
- Taxa de poupança: ${dados.taxaPoupanca?.toFixed(1) || 0}%
- Atividades pendentes: ${dados.atividadesPendentes || 0}
- Metas atrasadas: ${dados.metasAtrasadas || 0}

Gere UMA dica financeira ou de produtividade curta (máximo 2 frases), prática e motivacional. 
Comece com um emoji relevante. Não use formatação markdown.`;

    return await gerarTexto(prompt);
  } catch (error) {
    console.error('Erro ao gerar dica:', error.message);
    return null;
  }
};

/**
 * Chat interativo com o assistente financeiro
 */
const chatComAssistente = async (mensagem, contexto) => {
  try {
    if (!getProvider()) {
      return 'Assistente IA não configurado. Configure a GROQ_API_KEY no servidor.';
    }

    // Construir contexto detalhado com TODOS os dados do utilizador
    let dadosCompletos = `
📊 DADOS FINANCEIROS DO UTILIZADOR:
- Gastos do mês: MZN ${contexto.gastosMes?.toFixed(2) || 0}
- Entradas do mês: MZN ${contexto.entradasMes?.toFixed(2) || 0}
- Balanço: MZN ${contexto.balancoMes?.toFixed(2) || 0}
- Taxa de poupança: ${contexto.taxaPoupanca?.toFixed(1) || 0}%
`;

    // Detalhes dos gastos por categoria
    if (contexto.gastosPorCategoria && contexto.gastosPorCategoria.length > 0) {
      dadosCompletos += `\n💰 GASTOS POR CATEGORIA:\n`;
      contexto.gastosPorCategoria.forEach((cat, i) => {
        dadosCompletos += `${i + 1}. ${cat.categoria}: MZN ${cat.total?.toFixed(2)} (${cat.count} transações)\n`;
      });
    }

    // Lista de gastos recentes
    if (contexto.gastosRecentes && contexto.gastosRecentes.length > 0) {
      dadosCompletos += `\n📝 ÚLTIMOS 10 GASTOS:\n`;
      contexto.gastosRecentes.forEach((g, i) => {
        dadosCompletos += `${i + 1}. ${g.titulo} - MZN ${g.valor?.toFixed(2)} (${g.categoria}, ${new Date(g.data).toLocaleDateString('pt-BR')})\n`;
      });
    }

    // Lista de entradas recentes
    if (contexto.entradasRecentes && contexto.entradasRecentes.length > 0) {
      dadosCompletos += `\n💵 ÚLTIMAS 10 ENTRADAS:\n`;
      contexto.entradasRecentes.forEach((e, i) => {
        dadosCompletos += `${i + 1}. ${e.titulo} - MZN ${e.valor?.toFixed(2)} (${e.categoria || 'Sem categoria'}, ${new Date(e.data).toLocaleDateString('pt-BR')})\n`;
      });
    }

    // Atividades
    dadosCompletos += `\n📋 ATIVIDADES:\n`;
    dadosCompletos += `- Total: ${contexto.atividadesTotal || 0}\n`;
    dadosCompletos += `- Realizadas: ${contexto.atividadesRealizadas || 0}\n`;
    dadosCompletos += `- Pendentes: ${contexto.atividadesPendentes || 0}\n`;
    dadosCompletos += `- Em andamento: ${contexto.atividadesEmAndamento || 0}\n`;

    if (contexto.atividadesLista && contexto.atividadesLista.length > 0) {
      dadosCompletos += `\nPróximas atividades:\n`;
      contexto.atividadesLista.slice(0, 5).forEach((a, i) => {
        dadosCompletos += `${i + 1}. ${a.titulo} (${a.status}, prioridade: ${a.prioridade})\n`;
      });
    }

    // Metas
    dadosCompletos += `\n🎯 METAS:\n`;
    dadosCompletos += `- Total: ${contexto.metasTotal || 0}\n`;
    dadosCompletos += `- Concluídas: ${contexto.metasConcluidas || 0}\n`;
    dadosCompletos += `- Em andamento: ${contexto.metasEmAndamento || 0}\n`;

    if (contexto.metasLista && contexto.metasLista.length > 0) {
      dadosCompletos += `\nMetas do utilizador:\n`;
      contexto.metasLista.forEach((m, i) => {
        const progresso = m.valorAtual && m.valorAlvo ? ((m.valorAtual / m.valorAlvo) * 100).toFixed(0) : 0;
        dadosCompletos += `${i + 1}. ${m.titulo} - ${progresso}% concluído (${m.status})\n`;
      });
    }

    // Projetos
    dadosCompletos += `\n📁 PROJETOS:\n`;
    dadosCompletos += `- Total: ${contexto.projetosTotal || 0}\n`;
    dadosCompletos += `- Cumpridos: ${contexto.projetosCumpridos || 0}\n`;
    dadosCompletos += `- Pendentes: ${contexto.projetosPendentes || 0}\n`;

    if (contexto.projetosLista && contexto.projetosLista.length > 0) {
      dadosCompletos += `\nProjetos do utilizador:\n`;
      contexto.projetosLista.forEach((p, i) => {
        dadosCompletos += `${i + 1}. ${p.titulo} - ${p.cumprido ? '✅ Cumprido' : '⏳ Pendente'}${p.dataProjecto ? ` (prazo: ${p.dataProjecto})` : ''}\n`;
      });
    }

    const systemPrompt = `Você é SIKU AI, um assistente financeiro pessoal inteligente, amigável e bem informado.
Você tem ACESSO COMPLETO a todos os dados financeiros e de produtividade do utilizador:

${dadosCompletos}

INSTRUÇÕES:
1. Use TODOS estes dados para dar respostas precisas e personalizadas
2. Quando o utilizador perguntar sobre gastos, metas, projetos, etc., consulte os dados acima
3. Seja específico - mencione valores, nomes de categorias, títulos de projetos/metas quando relevante
4. Dê conselhos práticos baseados nos dados reais do utilizador
5. Se o utilizador perguntar algo que não está nos dados, diga que não tem essa informação
6. Responda em português de forma amigável e útil
7. Limite respostas a 2-4 parágrafos
8. IMPORTANTE: Não use formatação markdown como ** ou #. Use apenas texto simples com emojis.
9. Moeda: MZN (Meticais moçambicanos)`;

    const resposta = await gerarTexto(mensagem, systemPrompt);
    return resposta || 'Desculpe, não consegui processar sua pergunta.';
  } catch (error) {
    console.error('Erro no chat:', error.message);
    
    if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      return '⚠️ O serviço de IA está temporariamente indisponível (limite de uso atingido). Tente novamente em alguns minutos.';
    }
    if (error.message?.includes('401') || error.message?.includes('API_KEY')) {
      return '⚠️ Serviço de IA não configurado corretamente. Entre em contacto com o suporte.';
    }
    
    return 'Ocorreu um erro ao processar sua pergunta. Tente novamente em alguns instantes.';
  }
};

/**
 * Retorna informações sobre o provider ativo
 */
const getProviderInfo = () => {
  const provider = getProvider();
  return {
    provider,
    name: provider === 'groq' ? 'Groq (Llama 3.3 70B)' : null,
    configured: !!provider
  };
};

module.exports = {
  gerarAnaliseFinanceira,
  gerarDicaDoDia,
  chatComAssistente,
  getProviderInfo
};
