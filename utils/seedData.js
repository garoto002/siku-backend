const Area = require('../models/Area');
const Categoria = require('../models/Categoria');

// Dados iniciais para novos usuários
const dadosIniciais = {
  areas: [
    {
      nome: 'Saúde e Bem-estar',
      cor: '#10B981', // Verde
      categorias: [
        { nome: 'Exercícios Físicos', cor: '#059669' },
        { nome: 'Alimentação Saudável', cor: '#047857' },
        { nome: 'Sono e Descanso', cor: '#065F46' },
        { nome: 'Saúde Mental', cor: '#064E3B' }
      ]
    },
    {
      nome: 'Carreira e Estudos',
      cor: '#3B82F6', // Azul
      categorias: [
        { nome: 'Produtividade', cor: '#2563EB' },
        { nome: 'Aprendizado', cor: '#1D4ED8' },
        { nome: 'Networking', cor: '#1E40AF' },
        { nome: 'Metas Profissionais', cor: '#1E3A8A' }
      ]
    },
    {
      nome: 'Relacionamentos',
      cor: '#F59E0B', // Âmbar
      categorias: [
        { nome: 'Família', cor: '#D97706' },
        { nome: 'Amigos', cor: '#B45309' },
        { nome: 'Romance', cor: '#92400E' },
        { nome: 'Comunicação', cor: '#78350F' }
      ]
    },
    {
      nome: 'Finanças',
      cor: '#8B5CF6', // Roxo
      categorias: [
        { nome: 'Economia', cor: '#7C3AED' },
        { nome: 'Investimentos', cor: '#6D28D9' },
        { nome: 'Planeamento', cor: '#5B21B6' },
        { nome: 'Controle de Gastos', cor: '#4C1D95' }
      ]
    },
    {
      nome: 'Desenvolvimento Pessoal',
      cor: '#EF4444', // Vermelho
      categorias: [
        { nome: 'Habilidades', cor: '#DC2626' },
        { nome: 'Leitura', cor: '#10B981' }, // Verde
        { nome: 'Criatividade', cor: '#991B1B' },
        { nome: 'Autoconhecimento', cor: '#7F1D1D' }
      ]
    },
    {
      nome: 'Casa e Família',
      cor: '#06B6D4', // Ciano
      categorias: [
        { nome: 'Organização', cor: '#0891B2' },
        { nome: 'Manutenção', cor: '#0E7490' },
        { nome: 'Culinária', cor: '#155E75' },
        { nome: 'Actividades Familiares', cor: '#164E63' }
      ]
    },
    {
      nome: 'Lazer e Hobbies',
      cor: '#EC4899', // Rosa
      categorias: [
        { nome: 'Esportes', cor: '#DB2777' },
        { nome: 'Artes', cor: '#BE185D' },
        { nome: 'Música', cor: '#9D174D' },
        { nome: 'Viagens', cor: '#831843' }
      ]
    }
  ]
};

// Função para criar dados iniciais para um usuário
const criarDadosIniciais = async (usuarioId) => {
  try {
    console.log('🌱 Criando dados iniciais para usuário:', usuarioId);

    const areasCriadas = [];

    for (const areaData of dadosIniciais.areas) {
      // Criar área
      const area = await Area.create({
        nome: areaData.nome,
        cor: areaData.cor,
        usuario: usuarioId
      });

      console.log('✅ Área criada:', area.nome);

      // Criar categorias para esta área
      const categoriasCriadas = [];
      for (const categoriaData of areaData.categorias) {
        const categoria = await Categoria.create({
          nome: categoriaData.nome,
          cor: categoriaData.cor,
          area: area._id,
          usuario: usuarioId
        });
        categoriasCriadas.push(categoria);
      }

      console.log(`✅ ${categoriasCriadas.length} categorias criadas para ${area.nome}`);

      areasCriadas.push({
        ...area.toObject(),
        categorias: categoriasCriadas
      });
    }

    console.log(`🎉 Dados iniciais criados: ${areasCriadas.length} áreas com suas categorias`);

    return {
      success: true,
      data: areasCriadas,
      message: 'Dados iniciais criados com sucesso'
    };

  } catch (error) {
    console.error('❌ Erro ao criar dados iniciais:', error);
    return {
      success: false,
      message: 'Erro ao criar dados iniciais',
      error: error.message
    };
  }
};

module.exports = { criarDadosIniciais, dadosIniciais };