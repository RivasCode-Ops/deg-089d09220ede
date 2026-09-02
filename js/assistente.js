/* Georgiano 5555 — assistente de perguntas
 *
 * NÃO É UM MODELO DE LINGUAGEM. É recuperação: casa a pergunta com um registro
 * de dados/campanha.js e devolve o registro, com a fonte ao lado. Um LLM aqui
 * seria impossível de hospedar (Pages não tem servidor, a chave iria no
 * cliente) e perigoso (inventaria entrega na página de um candidato, em ano
 * eleitoral — Res. TSE 23.610/2019, redação da 23.755/2026, art. 9º-B).
 *
 * REGRA QUE SUSTENTA TUDO: nenhum número é escrito neste arquivo. Todo número
 * sai de window.CAMPANHA no momento da resposta, e o verificador reprova este
 * arquivo se aparecer aqui um número de três dígitos ou mais.
 *
 * --------------------------------------------------------------------------
 * REESCRITA DE 01/09/2026, depois de o Rivas testar com oito perguntas.
 * A abordagem estava certa e a execução estava errada. O que mudou:
 *
 * 1. ELE FALAVA MAIS DE SI DO QUE DO CANDIDATO. A primeira tela era 100%
 *    disclaimer — tarja fixa mais mensagem de abertura repetindo a tarja, ~290
 *    caracteres sobre o que ele NÃO é antes de qualquer informação. O aviso
 *    virou uma linha no cabeçalho, e a abertura virou um comando.
 *
 * 2. UM FALLBACK SÓ, PARA TRÊS NECESSIDADES DIFERENTES. "Quanto custou o
 *    asfalto?", "ele já foi condenado?" e "asdkjhasd" recebiam o mesmo bloco
 *    de 330 caracteres, palavra por palavra. Agora são três saídas distintas.
 *
 * 3. DIZIA "não tenho isso registrado" QUANDO TINHA. Perguntado o valor da
 *    obra de Várzea Queimada, caía no fallback — mas a obra está na página,
 *    com a ressalva "valor e status não conferidos". Isso não é estilo, é
 *    defeito: derruba exatamente a confiança que o resto foi feito para ganhar.
 *    Nasceu daí o casador de ENTREGA, que acha por título, tag, povoado e
 *    contexto, e responde "tenho a obra, não tenho o valor".
 *
 * 4. DESPEJAVA A SEÇÃO INTEIRA. "Quantas leis ele fez?" tem uma resposta: 12.
 *    Vinham cinco blocos e ~700 caracteres. Agora é resposta primeiro, detalhe
 *    atrás de um botão.
 *
 * 5. FALAVA COMO AUDITORIA, NÃO COMO CAMPANHA. "arquivo de dados", "registrado
 *    nesta página", "não vou inventar" — em toda resposta. Dito uma vez é
 *    credibilidade; dito sempre é uma campanha pedindo desculpa por existir.
 *
 * 6. NÃO CONVERTIA NADA. Todo beco sem saída terminava no painel de pendências,
 *    que é peça interna de gabinete. Agora termina em demanda, que vira
 *    mensagem para o gabinete.
 *
 * Riva's Alexandre · 01/09/2026
 */
(function () {
  'use strict';

  var D = window.CAMPANHA;
  var GN = window.GN;
  if (!D || !GN) { return; }

  var el = GN.el;
  var chave = GN.chave;
  var fonteLinha = GN.fonteLinha;

  var corpo, campo, chipsBox, painel, lancador;
  var fluxo = null, rascunho = {};

  /* ---------- conversa ---------- */

  function bolha(quem) {
    var b = el('div', 'msg msg-' + quem);
    corpo.appendChild(b);
    return b;
  }

  function rolar() { corpo.scrollTop = corpo.scrollHeight; }

  function chips(lista) {
    chipsBox.textContent = '';
    (lista || []).forEach(function (t) {
      var b = el('button', 'chip', t);
      b.type = 'button';
      b.addEventListener('click', function () { perguntar(t); });
      chipsBox.appendChild(b);
    });
  }

  /* Botão de ação dentro da resposta — o que faz a conversa virar alguma
     coisa. Fica na bolha, e não nos chips, porque chip é sugestão e isto é
     a saída. */
  function acao(alvo, rotulo, fn) {
    var b = el('button', 'msg-acao', rotulo);
    b.type = 'button';
    b.addEventListener('click', fn);
    alvo.appendChild(b);
    return b;
  }

  function linkAcao(alvo, rotulo, url) {
    var a = el('a', 'msg-acao', rotulo);
    a.href = url; a.rel = 'noopener noreferrer'; a.target = '_blank';
    alvo.appendChild(a);
    return a;
  }

  function zapCanal() {
    return D.canais.filter(function (c) { return c.id === 'whatsapp' && c.url; })[0] || null;
  }

  /* ---------- casamento ----------
     Teste real com 19 consultas em 02/09/2026: o motor acertava 8. As três
     falhas mais prováveis do público real eram as mais simples — "barra",
     "jaico" e "sao raimundo" não casavam, porque o casamento exigia o nome
     inteiro dentro da pergunta.

     Cada assunto agora devolve PESO, e quem lidera é o de maior peso — não o
     primeiro da lista. Antes, "sao raimundo nonato" abria com uma entrega
     genérica e o município ia para o rodapé de "você também perguntou". */

  var PARTICULAS = { de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1, o: 1, a: 1,
                     os: 1, as: 1, em: 1, no: 1, na: 1, um: 1, uma: 1, que: 1,
                     qual: 1, quais: 1, me: 1, pra: 1, para: 1, por: 1, com: 1,
                     sobre: 1, ele: 1, dele: 1, sao: 1, foi: 1, ja: 1, se: 1 };

  function fichas(q) {
    return q.split(/[^a-z0-9]+/).filter(function (t) {
      return t.length >= 3 && !PARTICULAS[t];
    });
  }

  /* Prefixo, e não só nome inteiro: no celular, com teclado pequeno, o
     eleitor de Barras digita "barra". Mínimo de 4 letras porque abaixo disso
     o prefixo casa com meio estado — "sao" sozinho pega 24 municípios. */
  function casaNome(fs, nomeChave) {
    var palavras = nomeChave.split(/\s+/);
    var significativas = palavras.filter(function (w) { return w.length >= 4 && !PARTICULAS[w]; });
    var forte = 0, fraco = 0, cobertas = {};
    fs.forEach(function (t) {
      if (nomeChave === t) {
        forte += 3;
        significativas.forEach(function (w) { cobertas[w] = 1; });
        return;
      }
      if (palavras.indexOf(t) !== -1) { forte += 2; cobertas[t] = 1; return; }
      if (t.length >= 4) {
        var pre = palavras.filter(function (w) { return w.indexOf(t) === 0; })[0];
        if (pre) { fraco += 1; cobertas[pre] = 1; }
      }
    });
    /* Cobertura nos DOIS sentidos. "raimundo nonato" cobre todas as palavras
       significativas de São Raimundo Nonato — a pergunta É o nome, e o
       município tem de liderar. "agua" cobre metade de Água Branca: é palavra
       de tema que por acaso abre um nome de cidade, e ali quem manda é a
       pauta. Sem essa distinção, "sao raimundo nonato" abria com uma entrega
       genérica e o município ia para o rodapé de "você também perguntou". */
    var nomeCoberto = significativas.length > 0 &&
      significativas.every(function (w) { return cobertas[w]; });
    return { forte: forte, fraco: fraco, nomeCoberto: nomeCoberto };
  }

  /* ---------- assuntos ----------
     Cada um devolve { titulo, curta, detalhe(alvo), entrada, chips, saida(alvo) }
     ou null. `curta` é A RESPOSTA — uma frase. O resto é opcional e vem
     atrás de um botão. */

  function identidade(q) {
    /* SÓ segunda pessoa. Antes bastava "o georgiano" na frase, então "quem é
       o Georgiano" — que pede a biografia — recebia a negação de "você é o
       Georgiano?". Além de não responder, soava ríspido. */
    if (!/\b(voce e|voce eh|e voce|voce fala|voce nao|vc |robo|bot|inteligencia artificial|\bia\b|humano|quem e voce|quem responde|com quem eu|com quem estou)/.test(q)) {
      return null;
    }
    return {
      peso: 95,
      titulo: null,
      curta: 'Não. Sou um assistente automático da página — o Georgiano não fala por aqui, e eu não invento resposta.',
      chips: ['O que chegou na minha cidade?', 'Quantas leis ele fez?']
    };
  }

  /* O casador que faltava. Acha a entrega por título, por tag, por povoado
     citado no contexto e por cidade — e responde com o que se sabe E com o
     que não se sabe, em vez de dizer que não tem nada. */
  function entrega(q) {
    var achou = null, melhor = 0;
    D.entregas.filter(function (e) { return e.publicar; }).forEach(function (e) {
      var campos = [e.titulo, e.tag, e.contexto, e.cidades.join(' ')].join(' ');
      var limpo = chave(campos);
      var termos = limpo.split(/[^a-z0-9]+/).filter(function (t) { return t.length >= 5; });
      var pontos = 0;
      termos.forEach(function (t) { if (q.indexOf(t) !== -1) { pontos++; } });
      /* Par de palavras vizinhas vale mais que duas soltas: "varzea queimada"
         na pergunta e um povoado, e nao a soma de Varzea Grande com Queimada
         Nova. Sem isto, o municipio ganhava da obra por coincidencia. */
      for (var k = 0; k < termos.length - 1; k++) {
        var par = termos[k] + ' ' + termos[k + 1];
        if (limpo.indexOf(par) !== -1 && q.indexOf(par) !== -1) { pontos += 3; }
      }
      if (pontos > melhor) { melhor = pontos; achou = e; }
    });
    if (!achou || melhor < 2) { return null; }

    var e = achou;
    /* "17 municípios atendidos em Acauã e Domingos Mourão" lido literalmente é
       contradição: são 17, não 2. "entre eles" resolve, e só entra quando há
       mais cidades do que as citadas. */
    var curta;
    if (e.destaque) {
      var mostra = e.cidades.slice(0, 3).join(', ');
      curta = e.destaque + ' ' + e.unidade +
        (e.cidades.length > 3 ? ' — entre eles ' + mostra + '.'
          : e.cidades.length ? ' — ' + mostra + '.' : '.');
    } else {
      curta = e.titulo + (e.cidades.length ? ' em ' + e.cidades.slice(0, 2).join(' e ') : '') + '.';
    }

    return {
      peso: 50 + melhor * 14,
      titulo: e.destaque ? e.titulo : null,
      curta: curta,
      /* A ressalva é a parte mais importante desta resposta: é ela que diz o
         que a página NÃO sabe sobre uma coisa que ela tem. */
      ressalva: e.ressalva,
      entrada: e,
      detalhe: e.contexto,
      chips: e.cidades.length
        ? ['O que mais chegou em ' + e.cidades[0] + '?', 'E as emendas?']
        : ['O que chegou na minha cidade?', 'E as emendas?']
    };
  }

  function municipio(q) {
    var fs = fichas(q);
    if (!fs.length) { return null; }

    var comEntrega = [], soNoMapa = [];
    GN.indice.forEach(function (v, k) {
      var m = casaNome(fs, k);
      if (m.forte || m.fraco) { comEntrega.push({ v: v, m: m, k: k }); }
    });
    var M = window.MAPA_PI;
    if (M) {
      M.municipios.forEach(function (x) {
        if (GN.indice.get(x.k)) { return; }
        var m = casaNome(fs, x.k);
        if (m.forte || m.fraco) { soNoMapa.push({ x: x, m: m }); }
      });
    }

    var todos = comEntrega.map(function (c) { return { nome: c.v.nome, forte: c.m.forte, fraco: c.m.fraco, pleno: c.m.nomeCoberto, v: c.v }; })
      .concat(soNoMapa.map(function (c) { return { nome: c.x.n, forte: c.m.forte, fraco: c.m.fraco, pleno: c.m.nomeCoberto, v: null }; }));
    if (!todos.length) { return null; }

    todos.sort(function (a, b) { return (b.forte - a.forte) || (b.fraco - a.fraco) || a.nome.localeCompare(b.nome, 'pt-BR'); });

    /* Desambiguação: "barra" casa Barras E Barra D'Alcântara. Escolher um dos
       dois no escuro é pior que perguntar — e a pergunta é uma linha. */
    var topo = todos[0];
    var empatados = todos.filter(function (t) { return t.forte === topo.forte && t.fraco === topo.fraco; });
    /* Desambiguar so quando a pergunta E praticamente o nome. Em "quanto custou
       o asfalto de varzea queimada" o prefixo pegava Queimada Nova, Varzea
       Branca e Varzea Grande — e a resposta certa era a obra, que o casador de
       entrega tinha. Pergunta longa com casamento so por prefixo e evidencia
       fraca, nao lista de escolha. */
    void empatados;
    /* Desambiguar quando a pergunta E praticamente o nome e ha mais de um
       candidato — nao so quando eles empatam. "barra" casa EXATO com Barra
       D'Alcantara e por PREFIXO com Barras: nao empatam, e mesmo assim quem
       digitou precisa escolher. Em pergunta longa nao se pergunta: ali o
       casamento por prefixo e evidencia fraca demais para virar uma escolha. */
    if (fs.length <= 2 && todos.length > 1 && todos.length <= 6) {
      return {
        peso: 88,
        titulo: null,
        curta: 'Você quis dizer ' + todos.map(function (t) { return t.nome; }).join(', ') + '?',
        chips: todos.map(function (t) { return t.nome; })
      };
    }

    if (topo.v) {
      var achou = topo.v;
      return {
        peso: (topo.pleno && topo.forte) ? 130 : (topo.forte ? 72 : 68),
        titulo: achou.nome,
        curta: achou.itens.length === 1
          ? 'Uma entrega listada em ' + achou.nome + '.'
          : achou.itens.length + ' entregas listadas em ' + achou.nome + '.',
        lista: achou.itens,
        chips: ['E as emendas?', 'Ver no mapa'],
        saida: function (alvo) {
          acao(alvo, 'Ver na busca da página', function () { GN.buscar(achou.nome); });
        }
      };
    }

    return {
      peso: (topo.pleno && topo.forte) ? 126 : (topo.forte ? 70 : 66),
      titulo: topo.nome,
      curta: 'Ainda não há entrega listada em ' + topo.nome + ' — a página cobre ' +
             GN.indice.size + ' dos ' + (M ? M.total : GN.indice.size) + ' municípios.',
      detalhe: 'Isso não quer dizer que nada chegou lá. O levantamento de emendas por ' +
               'município ainda não foi feito.',
      chips: ['E as emendas?', 'Ver no mapa'],
      saida: function (alvo) { botaoDemanda(alvo, 'Falar com o gabinete'); }
    };
  }

  function mandato(q) {
    if (!/\b(lei|leis|projeto|mandato|assembleia|alepi|autoria|pec|proposi|decreto|requerimento|deputado estadual|fez na)/.test(q)) {
      return null;
    }
    var M = D.mandato;
    if (!M) { return null; }
    var leis = M.itens.filter(function (i) { return i.chave === 'leis'; })[0];
    return {
      peso: 76,
      titulo: null,
      curta: (leis ? leis.valor + ' leis de autoria' : 'Atividade parlamentar') +
             ' em ' + M.mandatos + ' mandatos na Assembleia.',
      entrada: M,
      chips: ['Quantos votos ele teve?', 'O que chegou na minha cidade?'],
      maisRotulo: 'Ver os ' + M.itens.length + ' números',
      mais: function (alvo) {
        M.itens.forEach(function (i) {
          var it = el('div', 'msg-item');
          it.appendChild(el('span', 'msg-num num', i.valor));
          it.appendChild(el('b', null, i.rotulo));
          it.appendChild(el('p', null, i.nota));
          alvo.appendChild(it);
        });
      }
    };
  }

  function votos(q) {
    if (!/\b(voto|votac|eleic|elei[cç]|urna|mais votado)/.test(q)) { return null; }
    var ano = (q.match(/\b(20\d\d)\b/) || [])[1];
    var um = ano ? D.votos.filter(function (v) { return String(v.ano) === ano; })[0] : null;
    var ultima = D.votos[D.votos.length - 1];
    var v = um || ultima;
    return {
      peso: 74,
      titulo: null,
      curta: v.valor + ' votos em ' + v.ano + '. ' + v.legenda,
      entrada: v,
      chips: ['Quantas leis ele fez?', 'O que chegou na minha cidade?'],
      maisRotulo: um ? null : 'Ver as três eleições',
      mais: um ? null : function (alvo) {
        D.votos.forEach(function (x) {
          var it = el('div', 'msg-item');
          it.appendChild(el('span', 'msg-num num', x.valor));
          it.appendChild(el('b', null, 'votos em ' + x.ano));
          it.appendChild(el('p', null, x.legenda));
          alvo.appendChild(it);
        });
      }
    };
  }

  function emendas(q) {
    if (!/\bemenda/.test(q)) { return null; }
    return {
      peso: 73,
      titulo: null,
      curta: 'O levantamento de emendas por município ainda não foi feito — por isso não há ' +
             'valor de emenda nesta página.',
      detalhe: 'É o que falta para o mapa sair de ' + GN.indice.size + ' municípios marcados ' +
               'e cobrir o estado. Prefiro dizer isso a mostrar número que ninguém conferiu.',
      chips: ['O que chegou na minha cidade?', 'Ver no mapa'],
      saida: function (alvo) { botaoDemanda(alvo, 'Perguntar ao gabinete'); }
    };
  }

  function pauta(q) {
    /* Casa pelo nome E pelos sinônimos que o gabinete escreveu no dado —
       "trator" e "patrol" não estão em "Máquina no Chão". */
    var fs = fichas(q);
    var achou = null, melhorP = 0;
    D.pautas.forEach(function (p) {
      var termos = chave(p.nome).split(/[^a-z0-9]+/).filter(function (t) { return t.length >= 4; })
        .concat((p.sinonimos || []).map(chave));
      var pontos = 0;
      termos.forEach(function (t) {
        if (!t) { return; }
        if (q.indexOf(t) !== -1) { pontos += 2; return; }
        if (t.length >= 5 && fs.some(function (f) { return f.length >= 4 && t.indexOf(f) === 0; })) { pontos += 1; }
      });
      if (pontos > melhorP) { melhorP = pontos; achou = p; }
    });
    if (!achou) { return null; }
    var ligadas = D.entregas.filter(function (e) { return e.publicar && e.pauta === achou.id; });
    return {
      /* A pauta ganha da entrega quando a pergunta é uma palavra de tema:
         quem digita "saude" quer a pauta, não o cartão do SAMU. */
      peso: 70 + melhorP * 2,
      titulo: achou.nome,
      curta: achou.promessa,
      lista: ligadas.length ? ligadas : null,
      detalhe: ligadas.length ? null
        : 'É compromisso, não entrega: não há nada listado aqui como já feito.',
      chips: ['O que chegou na minha cidade?', 'E as emendas?']
    };
  }

  function cobertura(q) {
    if (!/\b(quantas cidades|quantos municipios|cobertura|todo o estado|mapa|abrangencia)/.test(q)) {
      return null;
    }
    var M = window.MAPA_PI;
    return {
      peso: 71,
      titulo: null,
      curta: GN.indice.size + ' dos ' + (M ? M.total : D.legal.uf) +
             ' municípios do Piauí têm entrega listada aqui, com fonte.',
      detalhe: 'No mapa, branco não quer dizer que nada chegou lá — quer dizer que não há ' +
               'entrega publicada com fonte.',
      chips: ['O que chegou na minha cidade?', 'E as emendas?']
    };
  }

  function quemE(q) {
    if (!/\b(quem e o|quem e ele|quem e georgiano|biografia|trajetoria|historia|idade|quantos anos|partido|cargo|candidato a|concorre|numero dele|fala do|sobre ele)/.test(q)) {
      return null;
    }
    var L = D.legal;
    var M = D.mandato;
    var ultima = D.votos[D.votos.length - 1];
    return {
      peso: 80,
      titulo: null,
      curta: L.nome + ', ' + (M ? M.mandatos + ' mandatos na Assembleia' : '') +
             '. Candidato a ' + L.cargo + ' pelo ' + L.partido + ', número ' + L.numero + '.',
      detalhe: ultima ? ultima.valor + ' votos em ' + ultima.ano + '. ' + ultima.legenda : null,
      entrada: ultima,
      chips: ['Quantas leis ele fez?', 'Quais são as propostas?', 'O que chegou na minha cidade?'],
      saida: function (alvo) {
        acao(alvo, 'Ler a biografia', function () {
          fechar();
          var sec = document.getElementById('quem');
          if (sec) { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        });
      }
    };
  }

  /* "quais são as propostas dele" não casava com nada, com cinco compromissos
     na página. É a pergunta genérica que resume a seção inteira. */
  function propostas(q) {
    if (!/\b(proposta|plano|compromisso|o que ele quer|o que pretende|bandeira|prioridade)/.test(q)) {
      return null;
    }
    return {
      peso: 75,
      titulo: 'As cinco pautas',
      curta: D.pautas.length + ' compromissos nomeados para o próximo mandato.',
      lista: null,
      chips: D.pautas.slice(0, 3).map(function (p) { return p.nome; }),
      saida: function (alvo) {
        D.pautas.forEach(function (p) {
          var it = el('div', 'msg-item');
          it.appendChild(el('b', null, p.nome));
          it.appendChild(el('p', null, p.promessa));
          alvo.appendChild(it);
        });
      }
    };
  }

  function canais(q) {
    if (!/\b(contato|whatsapp|instagram|facebook|youtube|rede social|redes|fal(o|a|ar|ei|e) com|grupo|segu(ir|e)|acompanh)/.test(q)) {
      return null;
    }
    var vivos = D.canais.filter(function (c) { return c.url; });
    return {
      peso: 68,
      titulo: null,
      curta: vivos.length
        ? 'Dá para acompanhar em ' + vivos.map(function (c) { return c.rotulo; }).join(' e ') + '.'
        : 'Os canais ainda não têm endereço confirmado nesta página.',
      chips: ['O que chegou na minha cidade?'],
      saida: function (alvo) {
        vivos.forEach(function (c) { linkAcao(alvo, c.arroba || c.rotulo, c.url); });
        botaoDemanda(alvo, 'Mandar uma mensagem');
      }
    };
  }

  function material(q) {
    if (!/\b(material|moldura|baixar|download|adesivo|santinho|foto de perfil|divulgar|logotipo)/.test(q)) {
      return null;
    }
    var prontos = (D.materiais || []).filter(function (m) { return m.modo; });
    return {
      peso: 66,
      titulo: null,
      curta: prontos.length
        ? 'Dá para baixar ' + prontos.length + ' coisas agora — a moldura ' + D.legal.numero + ' é a principal.'
        : 'Ainda não há material para baixar.',
      chips: ['O que chegou na minha cidade?'],
      saida: function (alvo) {
        acao(alvo, 'Ir para o material', function () {
          fechar();
          var s = document.getElementById('divulgar');
          if (s) { s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        });
      }
    };
  }

  /* Pergunta de posição política. Não é lacuna de dado: é coisa que só o
     candidato responde, e o assistente não fala por ele. */
  function opiniao(q) {
    if (!/\b(o que ele acha|acha sobre|posicao|posicionamento|e a favor|contra|defende|opiniao|vota a favor|apoia|aliado|governo|bolsonaro|lula|condenad|processo|denuncia|corrup|escandalo)/.test(q)) {
      return null;
    }
    return {
      peso: 72,
      titulo: null,
      curta: 'Isso é posição política, e quem responde é o Georgiano — não eu.',
      chips: ['O que chegou na minha cidade?', 'Quantas leis ele fez?'],
      saida: function (alvo) { botaoDemanda(alvo, 'Mandar a pergunta'); }
    };
  }

  function demanda(q) {
    if (!/\b(quero falar|quero pedir|pedir|reclama|demanda|solicit|preciso de|minha rua|meu bairro|buraco|problema|ajud|sugest|voluntari|participar|colabora|apoiar|contribuir|fazer parte|entrar no grupo|me inscrev)/.test(q)) {
      return null;
    }
    return { peso: 92, abrirDemanda: true };
  }

  /* A ordem aqui não decide mais nada — o peso decide. Ela só existe para o
     desempate ser estável quando dois assuntos empatam. */
  var ASSUNTOS = [identidade, demanda, opiniao, municipio, pauta, propostas,
                  entrega, mandato, votos, emendas, cobertura, quemE, canais, material];

  /* ---------- fluxo de demanda ----------
     Sem servidor, ninguém "recebe" nada sozinho. O que dá para fazer é montar
     a mensagem e entregá-la pronta para a pessoa mandar — e dizer isso com
     todas as letras, em vez de fingir protocolo. */

  var PASSOS = [
    { campo: 'nome',     p: 'Como você se chama?' },
    { campo: 'cidade',   p: 'De qual cidade?' },
    { campo: 'mensagem', p: 'Escreva em uma frase o que você quer dizer ou pedir.' }
  ];

  /* Enquanto não houver canal, NÃO oferecer o fluxo. Pedir nome, cidade e
     mensagem para entregar um texto na área de transferência é um formulário
     abandonado no meio: três perguntas ao eleitor e nenhum destino. Custa a
     pessoa, e responder "o canal ainda não está no ar" custa nada. */
  function botaoDemanda(alvo, rotulo) {
    if (zapCanal()) { acao(alvo, rotulo, abreDemanda); return; }
    var outros = D.canais.filter(function (c) { return c.url; });
    outros.forEach(function (c) { linkAcao(alvo, 'Falar pelo ' + c.rotulo, c.url); });
  }

  function semCanal() {
    var outros = D.canais.filter(function (c) { return c.url; });
    /* Isto NAO e fallback: e resposta. Marcar como "nao entendi" faria a
       prova — e quem le — confundir uma coisa com a outra. */
    var b = bolha('bot');
    b.appendChild(el('p', 'msg-curta', outros.length
      ? 'O canal de mensagens do gabinete ainda não está no ar. Por enquanto dá para falar pelo ' +
        outros.map(function (c) { return c.rotulo; }).join(' e ') + '.'
      : 'O canal de mensagens do gabinete ainda não está no ar. Volte em breve.'));
    outros.forEach(function (c) { linkAcao(b, 'Abrir o ' + c.rotulo, c.url); });
    chips(sugestoes());
    rolar();
  }

  function abreDemanda() {
    if (!zapCanal()) { semCanal(); return; }
    fluxo = 0; rascunho = {};
    chips([]);
    var b = bolha('bot');
    b.appendChild(el('p', 'msg-curta', PASSOS[0].p));
    rolar();
    if (campo) { campo.focus(); }
  }

  function segueDemanda(v) {
    rascunho[PASSOS[fluxo].campo] = v;
    fluxo++;
    if (fluxo < PASSOS.length) {
      var b = bolha('bot');
      b.appendChild(el('p', 'msg-curta', PASSOS[fluxo].p));
      rolar();
      return;
    }
    fluxo = null;

    var texto = 'Olá! Sou ' + rascunho.nome + ', de ' + rascunho.cidade + '. ' + rascunho.mensagem;
    var b2 = bolha('bot');
    b2.appendChild(el('p', 'msg-curta', 'Pronto, ' + rascunho.nome + '. A mensagem está montada:'));

    var cx = el('div', 'msg-recado');
    cx.appendChild(el('p', null, texto));
    b2.appendChild(cx);

    var zap = zapCanal();
    if (zap) {
      linkAcao(b2, 'Enviar no WhatsApp', zap.url);
    } else {
      /* Sem canal, não existe "encaminhar". Dizer que o gabinete recebe seria
         mentira, e mentira aqui custa mais que a falta do botão. */
      acao(b2, 'Copiar a mensagem', function () {
        if (navigator.clipboard) { navigator.clipboard.writeText(texto); }
        b2.appendChild(el('p', 'msg-recado-ok', 'Copiado. Cole no WhatsApp do gabinete.'));
      });
      b2.appendChild(el('p', 'msg-mini',
        'Esta página não envia sozinha e não guarda o que você escreveu — o canal do gabinete ' +
        'ainda não está publicado aqui.'));
    }
    chips(sugestoes());
    rolar();
  }

  /* ---------- roteamento ---------- */

  function sugestoes() {
    var maior = null;
    GN.indice.forEach(function (v) {
      if (!maior || v.itens.length > maior.itens.length) { maior = v; }
    });
    return [
      'O que chegou em ' + (maior ? maior.nome : D.legal.uf) + '?',
      'Quantas leis ele fez?',
      'E as emendas?',
      'Quero falar com o gabinete'
    ];
  }

  function desenhar(r) {
    var b = bolha('bot');
    if (r.titulo) { b.appendChild(el('h5', null, r.titulo)); }
    b.appendChild(el('p', 'msg-curta', r.curta));
    if (r.ressalva) { b.appendChild(el('p', 'msg-ressalva', r.ressalva)); }
    if (r.detalhe) { b.appendChild(el('p', null, r.detalhe)); }

    if (r.lista) {
      r.lista.forEach(function (e) {
        var it = el('div', 'msg-item');
        it.appendChild(el('b', null, e.titulo));
        if (e.ressalva) { it.appendChild(el('p', 'msg-ressalva', e.ressalva)); }
        it.appendChild(fonteLinha(e));
        b.appendChild(it);
      });
    }

    if (r.entrada) { b.appendChild(fonteLinha(r.entrada)); }

    /* Detalhe atrás de um botão: a resposta cabe na tela, e quem quiser o
       resto pede. Antes vinham 700 caracteres de uma vez numa janelinha. */
    if (r.mais && r.maisRotulo) {
      var aberto = false;
      var caixa = el('div', 'msg-mais');
      var bt = acao(b, r.maisRotulo, function () {
        if (aberto) { return; }
        aberto = true;
        r.mais(caixa);
        bt.remove();
        rolar();
      });
      b.appendChild(caixa);
    }
    if (r.saida) { r.saida(b); }

    chips(r.chips || sugestoes());
    rolar();
  }

  function perguntar(texto) {
    var t = String(texto || '').trim();
    campo.value = '';
    if (!t) { return; }

    var eu = bolha('eu');
    eu.appendChild(el('p', null, t));

    if (fluxo !== null) { segueDemanda(t); return; }

    var q = chave(t);
    var achados = [];
    ASSUNTOS.forEach(function (fn) {
      var r = fn(q);
      if (r) { achados.push(r); }
    });
    /* Quem lidera é o de maior peso, não o primeiro da lista. Antes o bloco
       "você também perguntou sobre" recebia sistematicamente a MELHOR
       correspondência, porque a ordem do array decidia. */
    achados.sort(function (a, b) { return (b.peso || 0) - (a.peso || 0); });

    if (!achados.length) {
      /* Ruído ou pergunta fora do escopo. Curto, e com uma saída — não o
         mesmo discurso de 330 caracteres para tudo. */
      var b = bolha('bot');
      b.classList.add('msg-naosei');
      b.appendChild(el('p', 'msg-curta', 'Não entendi. Tente o nome da sua cidade — é o que eu faço melhor.'));
      botaoDemanda(b, 'Ou mande uma mensagem');
      chips(sugestoes());
      rolar();
      return;
    }

    if (achados[0].abrirDemanda) { abreDemanda(); return; }

    desenhar(achados[0]);

    /* Pergunta composta: responde a primeira e anuncia a segunda. Omissão
       silenciosa é pior que "não sei". */
    var segundo = achados[1];
    if (segundo && !segundo.abrirDemanda && segundo.titulo !== achados[0].titulo) {
      var ult = corpo.querySelectorAll('.msg-bot');
      var alvo = ult[ult.length - 1];
      var av = el('div', 'msg-tambem');
      av.appendChild(el('span', null, 'Você também perguntou sobre'));
      var bt2 = el('button', 'chip', segundo.titulo || segundo.curta.slice(0, 40));
      bt2.type = 'button';
      bt2.addEventListener('click', function () { desenhar(segundo); });
      av.appendChild(bt2);
      alvo.appendChild(av);
      rolar();
    }
  }

  /* ---------- lançador e painel ---------- */

  function abrir(foco) {
    painel.hidden = false;
    lancador.setAttribute('aria-expanded', 'true');
    document.body.classList.add('gn-chat-aberto');
    if (foco !== false) { campo.focus(); }
    rolar();
  }

  function fechar() {
    painel.hidden = true;
    lancador.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('gn-chat-aberto');
    lancador.focus();
  }

  function montar() {
    corpo = document.getElementById('pergunte-corpo');
    if (!corpo) { return; }
    campo = document.getElementById('pergunte-campo');
    chipsBox = document.getElementById('pergunte-sug');
    painel = document.getElementById('gn-chat');
    lancador = document.getElementById('gn-lancador');

    document.getElementById('pergunte-enviar').addEventListener('click', function () {
      perguntar(campo.value);
    });
    campo.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); perguntar(campo.value); }
    });

    if (painel && lancador) {
      lancador.addEventListener('click', function () {
        if (painel.hidden) { abrir(); } else { fechar(); }
      });
      document.getElementById('gn-chat-x').addEventListener('click', fechar);
      document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && !painel.hidden) { fechar(); }
      });
    }

    /* "quem responde aqui" — o disclaimer inteiro fica a um clique, em vez de
       ocupar a primeira tela. Some da conversa, permanece disponível. */
    var quem = document.getElementById('gn-chat-quem');
    if (quem) {
      quem.addEventListener('click', function () {
        perguntar('quem responde aqui');
      });
    }

    var abrirBt = document.getElementById('pergunte-abrir');
    if (abrirBt) { abrirBt.addEventListener('click', function () { abrir(); }); }

    /* Os três CTAs de participação abrem direto o fluxo de demanda — não a
       conversa vazia. Quem clicou em "mandar uma mensagem" já decidiu; pedir
       que digite a pergunta de novo é perder a decisão no meio do caminho. */
    [].forEach.call(document.querySelectorAll('.gn-cta-bt'), function (b) {
      b.addEventListener('click', function () { abrir(false); abreDemanda(); });
    });

    var exemplos = document.getElementById('pergunte-exemplos');
    if (exemplos) {
      sugestoes().forEach(function (t) {
        var b = el('button', 'chip', t);
        b.type = 'button';
        b.addEventListener('click', function () { abrir(false); perguntar(t); });
        exemplos.appendChild(b);
      });
    }

    /* Abertura: um comando, não dois parágrafos de disclaimer. */
    var ab = bolha('bot');
    ab.appendChild(el('p', 'msg-curta',
      'Digite o nome da sua cidade. Eu mostro o que chegou lá, com a fonte.'));
    chips(sugestoes());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montar);
  } else {
    montar();
  }
}());
