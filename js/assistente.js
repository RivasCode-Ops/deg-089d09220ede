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

  /* ---------- assuntos ----------
     Cada um devolve { titulo, curta, detalhe(alvo), entrada, chips, saida(alvo) }
     ou null. `curta` é A RESPOSTA — uma frase. O resto é opcional e vem
     atrás de um botão. */

  function identidade(q) {
    if (!/\b(voce e|voce eh|e voce|voce fala|e o georgiano|eh o georgiano|robo|bot|inteligencia|humano|quem e voce|quem responde|com quem)/.test(q)) {
      return null;
    }
    return {
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
      var termos = chave(campos).split(/[^a-z0-9]+/)
        .filter(function (t) { return t.length >= 5; });
      var pontos = 0;
      termos.forEach(function (t) { if (q.indexOf(t) !== -1) { pontos++; } });
      if (pontos > melhor) { melhor = pontos; achou = e; }
    });
    if (!achou || melhor < 2) { return null; }

    var e = achou;
    var onde = e.cidades.length ? ' em ' + e.cidades.slice(0, 2).join(' e ') : '';
    var curta = e.destaque
      ? e.destaque + ' ' + e.unidade + onde + '.'
      : e.titulo + onde + '.';

    return {
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
    var achou = null;
    GN.indice.forEach(function (v, k) {
      if (!achou && k.length >= 4 && q.indexOf(k) !== -1) { achou = v; }
    });
    if (achou) {
      return {
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

    var M = window.MAPA_PI, fora = null;
    if (M) {
      M.municipios.forEach(function (m) {
        if (!fora && m.k.length >= 4 && q.indexOf(m.k) !== -1) { fora = m; }
      });
    }
    if (!fora) { return null; }
    return {
      titulo: fora.n,
      curta: 'Ainda não há entrega listada em ' + fora.n + ' — a página cobre ' +
             GN.indice.size + ' dos ' + M.total + ' municípios.',
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
    var achou = null;
    D.pautas.forEach(function (p) {
      if (achou) { return; }
      var termos = chave(p.nome).split(/[^a-z0-9]+/).filter(function (t) { return t.length >= 4; });
      if (termos.some(function (t) { return q.indexOf(t) !== -1; })) { achou = p; }
    });
    if (!achou) { return null; }
    var ligadas = D.entregas.filter(function (e) { return e.publicar && e.pauta === achou.id; });
    return {
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
      titulo: null,
      curta: GN.indice.size + ' dos ' + (M ? M.total : D.legal.uf) +
             ' municípios do Piauí têm entrega listada aqui, com fonte.',
      detalhe: 'No mapa, branco não quer dizer que nada chegou lá — quer dizer que não há ' +
               'entrega publicada com fonte.',
      chips: ['O que chegou na minha cidade?', 'E as emendas?']
    };
  }

  function quemE(q) {
    if (!/\b(quem e o|quem e ele|biografia|trajetoria|historia|idade|quantos anos|partido|cargo|candidato a|concorre|numero dele)/.test(q)) {
      return null;
    }
    var L = D.legal;
    return {
      titulo: null,
      curta: 'Candidato a ' + L.cargo + ' pelo ' + L.partido + ' no ' + L.uf + '. Número ' + L.numero + '.',
      chips: ['Quantas leis ele fez?', 'Quantos votos ele teve?', 'O que chegou na minha cidade?']
    };
  }

  function canais(q) {
    if (!/\b(contato|whatsapp|instagram|facebook|youtube|rede social|redes|fal(o|a|ar|ei|e) com|grupo|segu(ir|e)|acompanh)/.test(q)) {
      return null;
    }
    var vivos = D.canais.filter(function (c) { return c.url; });
    return {
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
      titulo: null,
      curta: 'Isso é posição política, e quem responde é o Georgiano — não eu.',
      chips: ['O que chegou na minha cidade?', 'Quantas leis ele fez?'],
      saida: function (alvo) { botaoDemanda(alvo, 'Mandar a pergunta'); }
    };
  }

  function demanda(q) {
    if (!/\b(quero falar|quero pedir|pedir|reclama|demanda|solicit|preciso de|minha rua|meu bairro|buraco|falta|problema|ajuda|sugest)/.test(q)) {
      return null;
    }
    return { abrirDemanda: true };
  }

  var ASSUNTOS = [identidade, demanda, opiniao, entrega, municipio, mandato,
                  votos, emendas, pauta, cobertura, quemE, canais, material];

  /* ---------- fluxo de demanda ----------
     Sem servidor, ninguém "recebe" nada sozinho. O que dá para fazer é montar
     a mensagem e entregá-la pronta para a pessoa mandar — e dizer isso com
     todas as letras, em vez de fingir protocolo. */

  var PASSOS = [
    { campo: 'nome',     p: 'Como você se chama?' },
    { campo: 'cidade',   p: 'De qual cidade?' },
    { campo: 'mensagem', p: 'Escreva em uma frase o que você quer dizer ou pedir.' }
  ];

  function botaoDemanda(alvo, rotulo) {
    acao(alvo, rotulo, abreDemanda);
  }

  function abreDemanda() {
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
