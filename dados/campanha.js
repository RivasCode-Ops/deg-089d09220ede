/* Georgiano 5555 — fonte única de conteúdo da home.
 *
 * Regra desta pasta: nenhum número entra aqui sem `fonte` e sem `etiqueta`.
 *   etiqueta 'relatado'  = saiu em matéria ou consta em ficha; ninguém verificou o original
 *   etiqueta 'observado' = visto diretamente, com data
 *   etiqueta 'inferido'  = conclusão, não fato apurado — NUNCA vai para a página
 *
 * `publicar:false` mantém o registro fora da página até a pendência cair.
 * O registro fica aqui de propósito: apagar faria alguém reescrevê-lo em seis meses.
 *
 * Riva's Alexandre · 31/08/2026
 */
(function (raiz) {
  'use strict';

  var FONTES = {
    alepi:    { nome: 'Ficha parlamentar · ALEPI', url: 'https://sapl.al.pi.leg.br/parlamentar/281' },
    cef:      { nome: 'Cidades em Foco',           url: 'https://cidadesemfoco.com/georgiano-neto-participa-de-entregas-nas-areas-da-saude-e-agricultura-em-beneficio-de-municipios-piauienses/' },
    cefObras: { nome: 'Cidades em Foco',           url: 'https://cidadesemfoco.com/georgiano-neto-cumpre-agenda-intensa-no-sul-do-piaui-e-acompanha-obras-e-novos-investimentos/' }
  };

  raiz.CAMPANHA = {

    /* ---------------------------------------------------------------
     * Rodapé legal. O CNPJ é o único ponto do site onde ele aparece.
     * Enquanto cnpjConfirmado for false a página sai barrada — ver
     * js/app.js e verificar.mjs. Barrar, não avisar.
     * ------------------------------------------------------------- */
    legal: {
      cnpj: '68.289.770/0001-30',
      cnpjConfirmado: false,
      cnpjPendencia:
        'O rodapé aparece em duas grafias no feed: 68.289.770/0001-30 nos posts de 28-29/08 e ' +
        '63/289.770/0001-30 nos de 24-27/08. Pode ser erro na peça ou truncamento de OCR do Instagram — ' +
        'não dá para distinguir pela página. Abrir os posts de 24, 25 e 27/08 ampliados e conferir no DivulgaCand/TSE.',
      partido: 'Partido Social Democrático – PSD',
      numero: '5555',
      cargo: 'Deputado Federal',
      uf: 'Piauí',
      eleicao: '4 de outubro de 2026'
    },

    /* Âncora de autoridade. Três eleições, todas na mesma ficha. */
    votos: [
      { ano: 2014, valor: '37.204',  legenda: 'Deputado estadual mais jovem já eleito no Piauí — 20 anos de idade.',   fonte: FONTES.alepi, etiqueta: 'relatado' },
      { ano: 2018, valor: '79.723',  legenda: 'Maior votação para deputado estadual da história do estado até então.', fonte: FONTES.alepi, etiqueta: 'relatado' },
      { ano: 2022, valor: '109.025', legenda: 'Primeiro deputado estadual do Piauí a passar de 100 mil votos.',        fonte: FONTES.alepi, etiqueta: 'relatado' }
    ],

    /* ---------------------------------------------------------------
     * Entregas. Só entra o que tem nome, lugar e fonte.
     * `cidades: []` = a entrega existe mas não é localizável. Ela aparece
     * nos cartões e NÃO aparece na busca por município.
     * ------------------------------------------------------------- */
    entregas: [
      {
        id: 'pac-saude-17',
        pauta: 'saude-que-chega',
        tag: 'Saúde',
        titulo: 'Ambulância do SAMU, odonto móvel e van de paciente',
        destaque: '17',
        unidade: 'municípios atendidos',
        cidades: ['Acauã', 'Domingos Mourão', 'Barras', 'Inhuma', 'Floriano', 'Antônio Almeida',
                  'Fartura do Piauí', 'São Raimundo Nonato', 'Joaquim Pires', 'Parnaguá',
                  'Sigefredo Pacheco', 'Jacobina do Piauí', 'Água Branca', 'Bertolínia',
                  'Cabeceiras do Piauí', 'João Costa', 'Geminiano'],
        contexto: 'Entregas do Novo PAC Saúde — ambulâncias, unidades odontológicas móveis, micro-ônibus e vans de transporte de pacientes.',
        ressalva: 'Data e valor por município ainda não conferidos com o gabinete.',
        fonte: FONTES.cef, etiqueta: 'relatado', publicar: true
      },
      {
        id: 'tratores-80',
        pauta: 'maquina-no-chao',
        tag: 'Máquina',
        titulo: 'Tratores entregues no mandato, com outros 40 em fabricação',
        destaque: '80+',
        unidade: 'tratores no chão',
        cidades: [],
        contexto: 'Mecanização agrícola: máquina que abre estrada vicinal e limpa barreiro em município sem frota própria.',
        ressalva: 'A matéria não nomeia os municípios que receberam. Sem essa lista a entrega não entra na busca por cidade.',
        fonte: FONTES.cef, etiqueta: 'relatado', publicar: true
      },
      {
        id: 'varzea-queimada-asfalto',
        pauta: 'estrada-de-producao',
        tag: 'Estrada',
        titulo: 'Asfaltamento do povoado de Várzea Queimada',
        destaque: null, unidade: null,
        cidades: ['Jaicós'],
        contexto: 'A estrada que o caminhão usa para escoar produção — não a avenida do centro.',
        ressalva: 'Valor e status atual da obra ainda não conferidos.',
        fonte: FONTES.cefObras, etiqueta: 'relatado', publicar: true
      },
      {
        id: 'jaicos-cooper',
        pauta: 'estrada-de-producao',
        tag: 'Cidade',
        titulo: 'Pista de cooper',
        destaque: null, unidade: null,
        cidades: ['Jaicós'],
        contexto: 'Obra acompanhada em agenda no Sul do Piauí.',
        ressalva: 'Status atual não conferido.',
        fonte: FONTES.cefObras, etiqueta: 'relatado', publicar: true
      },
      {
        id: 'padre-marcos-rodovia',
        pauta: 'estrada-de-producao',
        tag: 'Estrada',
        titulo: 'Segunda etapa da rodovia',
        destaque: null, unidade: null,
        cidades: ['Padre Marcos'],
        contexto: 'Continuação de trecho já executado.',
        ressalva: 'Status atual não conferido.',
        fonte: FONTES.cefObras, etiqueta: 'relatado', publicar: true
      },
      {
        id: 'padre-marcos-praca',
        pauta: 'estrada-de-producao',
        tag: 'Cidade',
        titulo: 'Praça de eventos',
        destaque: null, unidade: null,
        cidades: ['Padre Marcos'],
        contexto: 'Obra acompanhada em agenda no Sul do Piauí.',
        ressalva: 'Status atual não conferido.',
        fonte: FONTES.cefObras, etiqueta: 'relatado', publicar: true
      },

      /* Fora do ar por decisão, não por esquecimento. */
      {
        id: 'maquinas-20',
        pauta: 'maquina-no-chao',
        tag: 'Máquina',
        titulo: '20 máquinas pesadas — tratores, motoniveladoras e pás carregadeiras',
        destaque: '20', unidade: 'máquinas pesadas',
        cidades: [],
        contexto: 'Entrega viabilizada por emenda parlamentar do deputado federal Júlio César ao Ministério da Agricultura. Georgiano participou da entrega.',
        ressalva: null,
        fonte: FONTES.cef, etiqueta: 'relatado',
        publicar: false,
        /* O motivo aqui é curto de propósito. Este arquivo é SERVIDO: qualquer
           pessoa que abrir o código-fonte do site lê o que estiver escrito
           nele. O raciocínio de crédito, a fórmula sugerida e a leitura de
           risco político moram em verificacaogeorgiano5555.md, que não vai ao
           ar. O gate só exige que exista um motivo escrito — e existe. */
        bloqueio:
          'Crédito de emenda do deputado federal Júlio César. A redação que dá o crédito ' +
          'correto está a validar com o gabinete — ver verificacaogeorgiano5555.md, item 2.'
      }
    ],

    /* As cinco pautas nomeadas. Aqui são compromissos — promessa não precisa
     * de prova de entrega; por isso "Água Todo Dia" fica nesta lista mesmo
     * travada na série de conteúdo, onde ela reivindicaria entrega. */
    pautas: [
      { id: 'maquina-no-chao',           nome: 'Máquina no Chão',              promessa: 'Trator, motoniveladora e pá carregadeira em município que hoje depende de favor para limpar uma estrada.' },
      { id: 'saude-que-chega',           nome: 'Saúde que Chega',              promessa: 'Ambulância, odonto móvel e van de paciente no município — porque saúde que obriga a viajar 200 km não é saúde.' },
      { id: 'estrada-de-producao',       nome: 'Estrada de Produção',          promessa: 'Asfalto e estrada vicinal ligando o povoado à cidade — não a obra bonita da avenida, a estrada que o caminhão usa.' },
      { id: 'agua-todo-dia',             nome: 'Água Todo Dia',                promessa: 'Poço, adutora e dessalinizador para o semiárido piauiense — água na torneira, não caminhão-pipa em ano de eleição.' },
      { id: 'primeiro-emprego-interior', nome: 'Primeiro Emprego do Interior', promessa: 'Qualificação e primeiro emprego para o jovem que hoje só tem duas opções: sair da cidade ou ficar parado.' }
    ],

    /* ---------------------------------------------------------------
     * Fotos, de selecaofotossitegeorgiano5555.md (31/08/2026).
     *
     * `arquivo` é o caminho local depois que o original em alta chegar.
     * Enquanto for null, o marcador na página diz QUAL foto falta e de onde
     * pedi-la — marcador anônimo não vira pedido, vira esquecimento.
     *
     * `origem` diz de onde a imagem PODE vir, e é regra, não preferência:
     *   'acervo'   — só foto própria da campanha. Vale para todo cartão de
     *                entrega e para os retratos. O teste é a legenda: se ela
     *                AFIRMA um fato ("ambulância entregue a 17 municípios"),
     *                ilustrar com equipamento genérico de banco ou com cena
     *                gerada é propaganda enganosa, não licença poética.
     *   'livre'    — banco de licença livre serve, porque a imagem só
     *                DESCREVE um lugar e não sustenta afirmação nenhuma.
     *   'ia'       — cena de ambiente gerada. Res. TSE 23.610/2019 (redação da
     *                23.755/2026, art. 9º-B): exige rótulo explícito,
     *                destacado e acessível NA PEÇA; proíbe simular fato ou
     *                pessoa real; e veda publicar sintético de 72h antes da
     *                eleição até 24h depois. Multa de R$ 5 mil a R$ 30 mil.
     *                Hoje nenhum slot usa, e o verificador exige o rótulo na
     *                página no dia em que algum usar.
     *   'montagem' — arte composta por designer (o cartão de link).
     *
     * `acervo:false` é pior que arquivo faltando: a foto não existe no perfil.
     * Três das cinco pautas estão nesse caso, e é buraco de acervo, não de
     * escolha. Nada aqui é para baixar do Instagram: o feed é referência de
     * qual foto pedir ao fotógrafo, nunca a fonte do arquivo do site.
     * ------------------------------------------------------------- */
    fotos: [
      { slot: 'hero', arquivo: 'img/_candidatas/hero.webp', acervo: true, origem: 'acervo',
        provisoria: 'Retrato oficial em 700×429 SEM EXIF, e com tarja branca nas laterais — o recorte usa ~330×429 do centro e amplia 1,7×. O slot pede 1400px de largura. Entra só na degustação.',
        titulo: 'Retrato oficial de campanha, sem o lockup',
        descricao: 'Camisa azul clara, fundo azul com a faixa em degradê verde/amarelo. A arte que circula ' +
                   'traz "GEORGIANO 5555 / CONFIANÇA PARA FAZER ACONTECER" queimado embaixo — no hero isso ' +
                   'repete o H1 e o logo do topo. Pedir o retrato limpo ou recortar acima do lockup.',
        post: 'https://www.instagram.com/p/DcGbtm6xMho/',
        recorte: 'Ele à direita, texto à esquerda no desktop; empilhar no mobile. Mínimo 1400px de largura.' },
      { slot: 'avatar', arquivo: 'img/_candidatas/avatar-perfil.jpg', acervo: true, origem: 'acervo',
        provisoria: 'Miniatura de 180×180 vinda de busca de imagem, sem EXIF. Entra só na degustação.',
        titulo: 'Retrato de perfil, quadrado',
        descricao: 'Rosto centralizado, fundo chapado, legível a 120px. É a foto que acompanha a lista de canais.',
        post: null, recorte: 'Quadrado, mínimo 400×400. O rosto ocupa a metade central.' },
      { slot: 'og', arquivo: null, acervo: true, origem: 'montagem',
        titulo: 'Cartão de link compartilhado — 1200×630',
        descricao: 'A arte 5555 · CONFIANÇA PARA FAZER ACONTECER existe, e é a certa — mas em 9:16. ' +
                   'O cartão de link é 1.91:1 e recorta pelo centro: sobram 29% da altura, e os ~30% de baixo, ' +
                   'onde está o lockup inteiro, ficam fora. Precisa de versão recomposta em deitado.',
        post: 'https://www.instagram.com/p/DcGbnuERhvM/',
        recorte: 'Exatos 1200×630, lockup ao lado do retrato e não embaixo.' },
      { slot: 'bio', arquivo: 'img/_candidatas/retrato-entrevista-terno.jpg', acervo: true, origem: 'acervo',
        provisoria: 'Não é o retrato do slot: é frame de entrevista, de terno, 390×320 numa caixa de 400×390. Entra só na degustação.',
        titulo: 'Retrato em contraluz',
        descricao: 'Polo branca com botom 5555, fundo escuro desfocado, contorno de luz no cabelo.',
        post: 'https://www.instagram.com/p/DcrptBlRtpr/',
        recorte: 'Vertical, ao lado do texto.' },
      { slot: 'entrega:maquina-no-chao', arquivo: 'img/_candidatas/trator.jpg', acervo: false, origem: 'acervo',
        provisoria: 'Sem procedência (zero EXIF) e a entrega maquinas-20 segue publicar:false pelo crédito da emenda. Entra só na degustação.',
        titulo: 'Entrega de trator ou máquina agrícola',
        descricao: 'Não existe nenhuma foto de máquina no perfil. Pedir ao acervo da assessoria.',
        post: null, recorte: null },
      { slot: 'entrega:saude-que-chega', arquivo: 'img/_candidatas/ambulancia.jpg', acervo: false, origem: 'acervo',
        provisoria: 'Sem procedência (zero EXIF), 596px numa caixa que pede ~740 em retina. Entra só na degustação.',
        titulo: 'Entrega de ambulância ou equipamento de saúde',
        descricao: 'Não existe nenhuma foto de equipamento de saúde no perfil. Pedir ao acervo.',
        post: null, recorte: null },
      { slot: 'entrega:estrada-de-producao', arquivo: 'img/_candidatas/carreata-1.jpg', acervo: true, origem: 'acervo',
        provisoria: 'Sem procedência (zero EXIF), 678px. Continua servindo as quatro entregas de estrada. Entra só na degustação.',
        titulo: 'Carreata em estrada, bandeira erguida',
        descricao: 'Substituto até chegar foto de obra real de asfalto em Jaicós ou Padre Marcos.',
        post: 'https://www.instagram.com/p/DcqugPqxaAO/', recorte: 'Quadrado.' },
      { slot: 'entrega:agua-todo-dia', arquivo: null, acervo: false, origem: 'acervo',
        titulo: 'Poço, adutora ou obra de água',
        descricao: 'Não existe no perfil. Pedir ao acervo.',
        post: null, recorte: null },
      { slot: 'entrega:primeiro-emprego-interior', arquivo: null, acervo: true, origem: 'acervo',
        titulo: 'Grupo de jovens de camisa azul',
        descricao: 'Selfie com jovens, mãos erguidas. Exatamente o público da pauta.',
        post: 'https://www.instagram.com/p/DclW8gsxASc/', recorte: 'Quadrado.' }
    ],

    /* Canal sem URL vira botão desligado que diz por quê — não link morto. */
    /* Material de campanha para baixar.
     *
     * `modo` diz o que o cartão faz, e é o que impede link morto:
     *   'ancora'  — leva a uma seção da própria página
     *   'gerar'   — o arquivo é montado no navegador de quem clicou, na hora
     *   'baixar'  — há arquivo em `arquivo`, e o verificador confere se existe
     *   ausente   — não há material ainda; o cartão diz o que é e quem produz,
     *               nunca um botão que não baixa nada
     *
     * Material eleitoral impresso carrega CNPJ e tiragem por lei. Enquanto
     * `legal.cnpjConfirmado` for falso, nada impresso entra aqui — está na
     * pendência 1 e é ela que barra. */
    materiais: [
      { id: 'moldura-perfil', modo: 'ancora', alvo: '#moldura',
        titulo: 'Moldura 5555 na sua foto',
        formato: 'PNG 1080×1080',
        descricao: 'Escolha a foto e baixe pronta. A imagem é montada dentro do seu navegador — ' +
                   'nenhum arquivo é enviado para servidor nenhum.' },
      { id: 'moldura-vazia', modo: 'gerar',
        titulo: 'Moldura vazia, para montar por fora',
        formato: 'PNG 1080×1080, fundo transparente',
        descricao: 'A faixa sozinha, sem foto, para quem prefere montar no editor que já usa. ' +
                   'Gerada no seu navegador quando você clica.' },
      { id: 'lockup', titulo: 'Logotipo em vetor',
        formato: 'SVG ou AI',
        descricao: 'O lockup fechado, para peça impressa e para arte de terceiro.',
        pendencia: 'Pendência 1.4 — o arquivo de marca não veio do designer. Hoje o nome no topo ' +
                   'do site é desenhado em fonte, o que serve para tela e não serve para impressão.' },
      { id: 'cartao-link', titulo: 'Cartão de link para WhatsApp',
        formato: 'JPG 1200×630',
        descricao: 'A imagem que aparece quando alguém cola o endereço do site numa conversa.',
        pendencia: 'A arte que existe é 9:16 e o cartão é 1.91:1 — o recorte central come o lockup ' +
                   'inteiro. Precisa de versão recomposta em deitado.' },
      { id: 'santinho', titulo: 'Santinho e adesivo',
        formato: 'PDF de impressão',
        descricao: 'Material impresso de rua.',
        pendencia: 'Não entra enquanto o CNPJ da campanha estiver em duas grafias — peça impressa ' +
                   'sai com CNPJ e tiragem por exigência legal. É a pendência 1.' }
    ],

    /* Atividade parlamentar na ALEPI — três mandatos, 2015 a 2026.
     *
     * Lida no SAPL, o sistema oficial da Assembleia, em 01/09/2026. Isto é o
     * dado que faltava para existir uma seção "Mandato": até hoje a pendência
     * 3 dizia "não há seção porque não há o dado".
     *
     * ETIQUETA 'relatado', E NÃO 'observado', de propósito. A leitura foi
     * automática, e DUAS leituras da mesma página divergiram: uma somou 217
     * requerimentos, 17 PDL e 8 IND; a outra somou 264, 20 e 9. A segunda
     * fecha nos dois eixos — os tipos somam 336 e os anos também somam 336 —
     * e por isso é a que está aqui. Mas divergência de instrumento não vira
     * número publicado sem olho humano: ver `pendencias`.
     *
     * O QUE NÃO ESTÁ AQUI: emendas parlamentares. O SAPL guarda proposição,
     * não orçamento. Emenda impositiva estadual mora no Portal da
     * Transparência do Piauí e na LOA, e não foi levantada.
     */
    mandato: {
      casa: 'Assembleia Legislativa do Piauí',
      periodo: '2015 — 2026',
      mandatos: 3,
      fonte: { nome: 'SAPL · Assembleia Legislativa do Piauí', url: 'https://sapl.al.pi.leg.br/parlamentar/281' },
      etiqueta: 'relatado',

      /* A ordem aqui é a ordem na tela, e ela é editorial: o que virou lei
         primeiro, o que foi proposto depois, e o volume por último. Um site
         de campanha que abre com "336 matérias" está inflando — 79% delas são
         requerimento, que é expediente de rotina. */
      itens: [
        { chave: 'leis', valor: '12', rotulo: 'leis de autoria',
          nota: 'Normas promulgadas com ele como primeiro autor: 2 em 2017, 1 em 2018, ' +
                '1 em 2019, 4 em 2021, 3 em 2022 e 1 em 2023.' },
        { chave: 'plo', valor: '40', rotulo: 'projetos de lei apresentados',
          nota: 'Projetos de lei ordinária como primeiro autor, ao longo dos três mandatos. ' +
                'Deles saíram as 12 leis acima.' },
        { chave: 'pdl', valor: '20', rotulo: 'projetos de decreto legislativo',
          nota: 'Em assembleia estadual, boa parte do decreto legislativo é título honorífico ' +
                'e medalha. Está contado à parte de lei por isso.' },
        { chave: 'pec', valor: '1', rotulo: 'proposta de emenda à Constituição',
          nota: 'Apresentada em 2016.' },
        { chave: 'total', valor: '336', rotulo: 'matérias no total',
          nota: 'Inclui 264 requerimentos — 79% do total. Requerimento é pedido de informação, ' +
                'voto de pesar, congratulação: expediente de rotina, e não realização.' }
      ]
    },

    canais: [
      { id: 'whatsapp',  rotulo: 'Entrar no grupo', url: null, pendencia: 'Link do grupo de WhatsApp não fornecido.' },
      { id: 'instagram', rotulo: 'Instagram', arroba: '@georgianoneto', url: 'https://www.instagram.com/georgianoneto/' },
      { id: 'facebook',  rotulo: 'Facebook',  url: null, pendencia: 'URL não fornecida.' },
      { id: 'youtube',   rotulo: 'YouTube',   url: null, pendencia: 'URL não fornecida.' }
    ],

    /* Buracos que travam peça pronta. Lidos por verificar.mjs. */
    pendencias: [
      { grau: 'bloqueia', item: 'CNPJ de campanha em duas grafias no feed',          trava: 'Rodapé legal de todo o site' },
      { grau: 'bloqueia', item: 'Crédito da emenda das 20 máquinas',                 trava: 'Entrega maquinas-20' },
      { grau: 'bloqueia', item: 'Contagens do SAPL conferidas por olho humano — duas leituras automáticas da mesma página divergiram em requerimentos (217 × 264), PDL (17 × 20) e IND (8 × 9); a segunda fecha nos dois eixos e é a que está no ar. Abrir sapl.al.pi.leg.br/parlamentar/281/materias e /normas e conferir os cinco números da seção Mandato.', trava: 'Seção Mandato · Prova de Entrega #07' },
      { grau: 'ajuste',   item: 'Emendas parlamentares estaduais por município — o SAPL guarda proposição, não orçamento. O dado mora no Portal da Transparência do Piauí e na LOA. É o item de maior retorno: hoje o mapa marca 19 dos 224 municípios.', trava: 'Mapa · Busca por município' },
      { grau: 'bloqueia', item: 'Entregas de água com nome de município (mínimo 2)', trava: 'Prova da pauta Água Todo Dia' },
      { grau: 'corrigir', item: 'Emendas destinadas por município e valores',        trava: 'Busca por cidade — hoje cobre 19 dos 224 municípios' },
      { grau: 'corrigir', item: 'Municípios que receberam os 80+ tratores',          trava: 'Entrega tratores-80 fora da busca por cidade' },
      { grau: 'corrigir', item: 'Data e valor das entregas do Novo PAC Saúde',       trava: 'Ressalva no cartão de saúde' },
      { grau: 'corrigir', item: 'Status atual das obras de Jaicós e Padre Marcos',   trava: 'Ressalva em quatro cartões' },
      { grau: 'corrigir', item: 'Originais em alta das 4 fotos já escolhidas',       trava: 'Hero, biografia e dois cartões seguem em marcador' },
      { grau: 'corrigir', item: 'Foto de máquina, de saúde e de água — não existem no acervo', trava: 'Três dos seis cartões de entrega ficam sem rosto' },
      { grau: 'corrigir', item: 'OG image exportada para arquivo local',             trava: 'Link compartilhado no WhatsApp sai sem cartão' },
      { grau: 'corrigir', item: 'Foto própria das obras de Jaicós e Padre Marcos',    trava: 'Quatro cartões dividem a mesma imagem de carreata' },
      { grau: 'corrigir', item: 'Arquivo de marca do designer (paleta e lockup)',    trava: 'Os hex da folha são leitura visual das peças, não guia de marca' },
      { grau: 'corrigir', item: 'Link do grupo de WhatsApp, Facebook e YouTube',     trava: 'Botão do topo e coluna do rodapé' }
    ]
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);
