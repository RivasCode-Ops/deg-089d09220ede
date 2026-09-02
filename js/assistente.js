/* Georgiano 5555 — assistente de perguntas
 *
 * NÃO É UM MODELO DE LINGUAGEM, e a diferença é o ponto.
 *
 * Um LLM neste site seria: (a) impossível de hospedar — GitHub Pages não tem
 * servidor, então a chamada sairia do navegador com a chave de API dentro do
 * código, pública; e (b) perigoso — um modelo que "responde tudo" sobre o
 * histórico de um candidato produz número, data e entrega que não existem, na
 * página dele, em ano eleitoral. A Res. TSE 23.610/2019 (redação da 23.755/2026,
 * art. 9º-B) exige rótulo explícito para conteúdo sintético, proíbe simular
 * fato, e veda publicar de 72h antes da eleição até 24h depois.
 *
 * Isto aqui é recuperação, não geração. Ele casa a pergunta com um registro de
 * dados/campanha.js e devolve o registro, com a fonte e a etiqueta ao lado.
 *
 * A REGRA QUE SUSTENTA TUDO: nenhum número é escrito neste arquivo. Todo
 * número sai de window.CAMPANHA no momento da resposta. O verificador reprova
 * este arquivo se aparecer aqui um número de três dígitos ou mais.
 *
 * --------------------------------------------------------------------------
 * REVISÃO DE 01/09/2026, a partir da auditoria do assistente do Wellington
 * Dantas (que por sua vez auditou o Ciro.IA). Aquele documento lista três
 * falhas a não copiar, e a primeira versão daqui tinha duas delas:
 *
 *   F1 — pergunta composta engolida. "Quem é ele e o que fez em Jaicós?"
 *        respondia a primeira metade e calava sobre a segunda, sem avisar.
 *        Omissão silenciosa é pior que "não sei".      → CORRIGIDA
 *   F2 — não responde sobre si. "Você é o Georgiano?" caía no fallback. É a
 *        pergunta mais previsível de todas.            → CORRIGIDA
 *   F3 — beco sem saída: o fallback devolve ao mesmo menu.  → CORRIGIDA
 *
 * O QUE NÃO FOI COPIADO DE LÁ, E POR QUÊ. O assistente do Wellington termina
 * o fallback abrindo um fluxo de demanda com número de protocolo: "o gabinete
 * protocola e te retorna pelo WhatsApp". Lá isso é verdade — há mandato e há
 * gabinete. Aqui não há: o canal de WhatsApp deste site ainda está sem URL,
 * e prometer retorno que ninguém dá é pior que não oferecer nada. A rota de
 * saída daqui é o que existe de verdade: a busca da cidade e o painel do que
 * falta conferir. No dia em que o canal ganhar URL, o fallback passa a
 * oferecê-lo sozinho — o gancho está escrito abaixo, não é promessa.
 *
 * E ele é CANDIDATO, o Wellington não é. Então o bot nunca pede voto, nunca
 * fala em primeira pessoa pelo Georgiano, e nunca promete coisa futura.
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

  var corpo, campo, chipsBox;

  /* ---------- a conversa ---------- */

  function bolha(quem) {
    var b = el('div', 'msg msg-' + quem);
    corpo.appendChild(b);
    return b;
  }

  function falaDele(texto) {
    var b = bolha('eu');
    b.appendChild(el('p', null, texto));
    return b;
  }

  /* Toda afirmação sai com a prova colada. Mesma gramática do resto da
     página: se não dá para dizer de onde veio, não vai para a tela. */
  function comProva(alvo, entrada) {
    if (entrada && entrada.fonte && entrada.etiqueta) { alvo.appendChild(fonteLinha(entrada)); }
    return alvo;
  }

  function chips(lista) {
    chipsBox.textContent = '';
    (lista || []).forEach(function (t) {
      var b = el('button', 'chip', t);
      b.type = 'button';
      b.addEventListener('click', function () { campo.value = t; perguntar(t); });
      chipsBox.appendChild(b);
    });
  }

  function rolar() {
    corpo.scrollTop = corpo.scrollHeight;
  }

  /* ---------- os assuntos ----------
     Cada um devolve { titulo, montar(alvo), chips } ou null. Devolver o
     objeto em vez de escrever direto na tela é o que permite descobrir que
     DOIS assuntos casaram e avisar sobre o segundo — a falha F1. */

  function achaMunicipio(q) {
    var achou = null;
    GN.indice.forEach(function (v, k) {
      if (!achou && k.length >= 4 && q.indexOf(k) !== -1) { achou = v; }
    });
    if (achou) {
      return {
        titulo: achou.nome,
        chips: ['Ver ' + achou.nome + ' na busca', 'E o mapa?', 'O que ainda falta conferir?'],
        montar: function (alvo) {
          alvo.appendChild(el('p', null, achou.itens.length === 1
            ? 'Há uma entrega listada em ' + achou.nome + ', com a fonte ao lado.'
            : 'Há ' + achou.itens.length + ' entregas listadas em ' + achou.nome + ', cada uma com a fonte ao lado.'));
          achou.itens.forEach(function (e) {
            var it = el('div', 'msg-item');
            it.appendChild(el('b', null, e.titulo));
            if (e.destaque) { it.appendChild(el('span', 'msg-num num', e.destaque + ' ' + e.unidade)); }
            it.appendChild(el('p', null, e.contexto));
            comProva(it, e);
            alvo.appendChild(it);
          });
        }
      };
    }

    var M = window.MAPA_PI;
    var fora = null;
    if (M) {
      M.municipios.forEach(function (m) {
        if (!fora && m.k.length >= 4 && q.indexOf(m.k) !== -1) { fora = m; }
      });
    }
    if (!fora) { return null; }
    return {
      titulo: fora.n,
      naoSei: true,
      chips: ['E o mapa?', 'E as emendas?', 'O que ainda falta conferir?'],
      montar: function (alvo) {
        alvo.appendChild(el('p', null,
          'Não há entrega publicada com fonte para ' + fora.n + ' nesta página. Isso não quer ' +
          'dizer que nada chegou lá: quer dizer que o levantamento de emendas por município ' +
          'ainda não foi feito. A busca cobre ' + GN.indice.size + ' dos ' + M.total + ' municípios.'));
      }
    };
  }

  /* F2 — a pergunta de identidade é a mais previsível de todas, e a primeira
     versão daqui não tinha resposta para ela. Terceira pessoa sempre: o bot
     não fala pelo candidato. */
  function identidade(q) {
    if (!/\b(voce e|voce eh|e voce|voce fala|e o georgiano|eh o georgiano|robo|rob|bot|inteligencia|ia|humano|quem e voce|quem es|com quem)/.test(q)) {
      return null;
    }
    return {
      titulo: 'Quem responde aqui',
      chips: ['De onde vêm os dados?', 'O que chegou na minha cidade?', 'O que ainda falta conferir?'],
      montar: function (alvo) {
        alvo.appendChild(el('p', null,
          'Não. Isto é um assistente automático da página, e não o Georgiano — ele não fala por aqui.'));
        alvo.appendChild(el('p', null,
          'Também não é inteligência artificial: não escrevo texto por conta própria. Eu procuro ' +
          'a resposta no arquivo que monta esta página e devolvo o registro com a fonte ao lado. ' +
          'Quando não encontro, digo que não sei.'));
      }
    };
  }

  function fontes(q) {
    if (!/\b(de onde|como sabe|checar|confia|inventa|verdade|fonte dos dados|dados vem)/.test(q)) {
      return null;
    }
    return {
      titulo: 'De onde vêm os dados',
      chips: ['O que ainda falta conferir?', 'Quantas leis ele fez?', 'E as emendas?'],
      montar: function (alvo) {
        alvo.appendChild(el('p', null,
          'Tudo que aparece aqui sai de um arquivo único de dados, e nada entra nele sem duas ' +
          'coisas: a fonte, com nome e endereço, e a etiqueta que diz como aquilo foi apurado.'));
        alvo.appendChild(el('p', null,
          'A etiqueta "relatado" quer dizer que saiu de matéria ou de ficha e ninguém abriu o ' +
          'original. É o caso da maior parte dos números desta página, e está escrito ao lado ' +
          'de cada um em vez de escondido.'));
      }
    };
  }

  function mandato(q) {
    if (!/\b(lei|leis|projeto|mandato|assembleia|alepi|autoria|pec|proposi|decreto|requerimento|deputado estadual|fez na)/.test(q)) {
      return null;
    }
    var M = D.mandato;
    if (!M) { return null; }
    return {
      titulo: 'Na Assembleia Legislativa do Piauí',
      chips: ['De onde vêm os dados?', 'E as emendas?', 'Quantos votos ele teve?'],
      montar: function (alvo) {
        alvo.appendChild(el('p', null, M.mandatos + ' mandatos, de ' + M.periodo + '.'));
        M.itens.forEach(function (i) {
          var it = el('div', 'msg-item');
          it.appendChild(el('span', 'msg-num num', i.valor));
          it.appendChild(el('b', null, i.rotulo));
          it.appendChild(el('p', null, i.nota));
          alvo.appendChild(it);
        });
        comProva(alvo, M);
      }
    };
  }

  function emendas(q) {
    if (!/\bemenda/.test(q)) { return null; }
    return {
      titulo: 'Emendas',
      naoSei: true,
      chips: ['E o mapa?', 'O que chegou na minha cidade?', 'O que ainda falta conferir?'],
      montar: function (alvo) {
        alvo.appendChild(el('p', null,
          'O levantamento de emendas por município não foi feito, e por isso não há nenhum ' +
          'valor de emenda nesta página. O dado existe: mora no Portal da Transparência do ' +
          'Piauí e na lei orçamentária do estado.'));
        alvo.appendChild(el('p', null,
          'É o item de maior retorno da lista de pendências — é ele que tiraria o mapa de ' +
          GN.indice.size + ' municípios marcados para perto do total do estado. Prefiro dizer ' +
          'isto a mostrar um número que ninguém conferiu.'));
      }
    };
  }

  function votos(q) {
    if (!/\b(voto|votac|eleic|elei[cç]|urna|mais votado)/.test(q)) { return null; }
    var ano = (q.match(/\b(20\d\d)\b/) || [])[1];
    var lista = ano ? D.votos.filter(function (v) { return String(v.ano) === ano; }) : D.votos;
    if (!lista.length) { lista = D.votos; }
    return {
      titulo: lista.length === 1 ? 'Votação de ' + lista[0].ano : 'As três votações',
      chips: ['Quantas leis ele fez?', 'De onde vêm os dados?', 'O que chegou na minha cidade?'],
      montar: function (alvo) {
        lista.forEach(function (v) {
          var it = el('div', 'msg-item');
          it.appendChild(el('span', 'msg-num num', v.valor));
          it.appendChild(el('b', null, 'votos em ' + v.ano));
          it.appendChild(el('p', null, v.legenda));
          comProva(it, v);
          alvo.appendChild(it);
        });
      }
    };
  }

  function pauta(q) {
    var achou = null;
    D.pautas.forEach(function (p) {
      if (achou) { return; }
      /* Casa por qualquer palavra do nome da pauta com 4 letras ou mais.
         "água" acha "Água Todo Dia" sem lista de sinônimos escrita à mão —
         lista de sinônimos envelhece longe do dado que ela serve. */
      var termos = chave(p.nome).split(/[^a-z0-9]+/).filter(function (t) { return t.length >= 4; });
      if (termos.some(function (t) { return q.indexOf(t) !== -1; })) { achou = p; }
    });
    if (!achou) { return null; }
    var ligadas = D.entregas.filter(function (e) { return e.publicar && e.pauta === achou.id; });
    return {
      titulo: achou.nome,
      naoSei: !ligadas.length,
      chips: ['O que chegou na minha cidade?', 'E as emendas?', 'O que ainda falta conferir?'],
      montar: function (alvo) {
        alvo.appendChild(el('p', null, achou.promessa));
        if (!ligadas.length) {
          alvo.appendChild(el('p', null,
            'Esta é uma pauta de compromisso, e não uma entrega: não há nada listado aqui como ' +
            'já realizado. Promessa não precisa de prova; entrega precisa.'));
          return;
        }
        alvo.appendChild(el('p', null, ligadas.length === 1
          ? 'Há uma entrega listada nesta pauta:'
          : 'Há ' + ligadas.length + ' entregas listadas nesta pauta:'));
        ligadas.forEach(function (e) {
          var it = el('div', 'msg-item');
          it.appendChild(el('b', null, e.titulo));
          if (e.cidades.length) { it.appendChild(el('p', null, e.cidades.join(' · '))); }
          comProva(it, e);
          alvo.appendChild(it);
        });
      }
    };
  }

  function cobertura(q) {
    if (!/\b(quantas cidades|quantos municipios|cobertura|todo o estado|mapa|abrangencia)/.test(q)) {
      return null;
    }
    var M = window.MAPA_PI;
    return {
      titulo: 'O mapa e a cobertura',
      chips: ['O que chegou na minha cidade?', 'E as emendas?', 'O que ainda falta conferir?'],
      montar: function (alvo) {
        alvo.appendChild(el('p', null,
          GN.indice.size + ' dos ' + (M ? M.total : D.legal.uf) + ' municípios do Piauí têm pelo ' +
          'menos uma entrega listada aqui, com fonte. O mapa desta página marca esses.'));
        alvo.appendChild(el('p', null,
          'O branco no mapa não quer dizer que nada chegou lá — quer dizer que não há entrega ' +
          'publicada com fonte nesta página.'));
      }
    };
  }

  function quemE(q) {
    if (!/\b(quem e o|quem e ele|biografia|trajetoria|historia|idade|quantos anos|partido|cargo|candidato a|concorre)/.test(q)) {
      return null;
    }
    var L = D.legal;
    return {
      titulo: 'Quem é',
      chips: ['Quantas leis ele fez?', 'Quantos votos ele teve?', 'O que chegou na minha cidade?'],
      montar: function (alvo) {
        alvo.appendChild(el('p', null,
          'Candidato a ' + L.cargo + ' pelo ' + L.partido + ' no ' + L.uf + ', na eleição de ' +
          L.eleicao + '.'));
        alvo.appendChild(el('p', null,
          'A biografia está na seção "Quem é" desta página, e o que ele fez na Assembleia está ' +
          'na seção "Mandato".'));
      }
    };
  }

  function canais(q) {
    if (!/\b(contato|whatsapp|instagram|facebook|youtube|rede social|redes|fal(o|a|ar|ei|e) com|grupo|segu(ir|e)|acompanh)/.test(q)) {
      return null;
    }
    var vivos = D.canais.filter(function (c) { return c.url; });
    return {
      titulo: 'Onde acompanhar',
      chips: ['O que chegou na minha cidade?', 'De onde vêm os dados?'],
      montar: function (alvo) {
        alvo.appendChild(el('p', null,
          vivos.length + ' de ' + D.canais.length + ' canais com endereço confirmado.'));
        D.canais.forEach(function (c) {
          var it = el('div', 'msg-item');
          it.appendChild(el('b', null, c.rotulo));
          if (c.url) {
            var a = el('a', null, c.arroba || 'abrir');
            a.href = c.url; a.rel = 'noopener noreferrer'; a.target = '_blank';
            it.appendChild(a);
          } else {
            it.appendChild(el('p', null, c.pendencia));
          }
          alvo.appendChild(it);
        });
      }
    };
  }

  function material(q) {
    if (!/\b(material|moldura|baixar|download|adesivo|santinho|foto de perfil|divulgar|logotipo)/.test(q)) {
      return null;
    }
    var lista = D.materiais || [];
    var prontos = lista.filter(function (m) { return m.modo; });
    return {
      titulo: 'Material para baixar',
      chips: ['O que chegou na minha cidade?', 'Onde acompanhar?'],
      montar: function (alvo) {
        alvo.appendChild(el('p', null,
          prontos.length + ' de ' + lista.length + ' itens disponíveis agora. O resto diz o que ' +
          'falta e quem produz.'));
        lista.forEach(function (m) {
          var it = el('div', 'msg-item');
          it.appendChild(el('b', null, m.titulo));
          it.appendChild(el('p', null, m.modo ? m.formato : m.pendencia));
          alvo.appendChild(it);
        });
      }
    };
  }

  function pendencias(q) {
    if (!/\b(pendencia|falta|conferi|prova|liberad|publicar|barrad)/.test(q)) { return null; }
    var travam = D.pendencias.filter(function (p) { return p.grau === 'bloqueia'; });
    return {
      titulo: 'O que ainda não foi conferido',
      chips: ['De onde vêm os dados?', 'E as emendas?', 'O que chegou na minha cidade?'],
      montar: function (alvo) {
        alvo.appendChild(el('p', null,
          travam.length + ' pendências bloqueiam a publicação desta página, e estão listadas por ' +
          'extenso no painel do fim. Enquanto houver uma, a página se declara não liberada.'));
        travam.forEach(function (p) {
          var it = el('div', 'msg-item');
          it.appendChild(el('b', null, p.item));
          alvo.appendChild(it);
        });
      }
    };
  }

  var ASSUNTOS = [identidade, achaMunicipio, mandato, emendas, votos, pauta,
                  cobertura, fontes, quemE, canais, material, pendencias];

  /* ---------- roteamento ---------- */

  function candidatos(q) {
    var achados = [];
    ASSUNTOS.forEach(function (fn) {
      var r = fn(q);
      if (r) { achados.push(r); }
    });
    return achados;
  }

  function sugestoesIniciais() {
    /* Saem do dado: o município com mais entregas e o ano da última votação.
       Sugestão escrita à mão vira mentira no dia em que o dado muda. */
    var maior = null;
    GN.indice.forEach(function (v) {
      if (!maior || v.itens.length > maior.itens.length) { maior = v; }
    });
    var ultima = D.votos[D.votos.length - 1];
    return [
      'O que chegou em ' + (maior ? maior.nome : D.legal.uf) + '?',
      'Quantas leis ele fez?',
      'E as emendas?',
      'Quantos votos em ' + (ultima ? ultima.ano : D.legal.eleicao) + '?',
      'Você é o Georgiano?',
      'O que ainda falta conferir?'
    ];
  }

  function perguntar(texto) {
    var q = chave(texto);
    campo.value = '';
    if (!q) { return; }

    falaDele(texto);

    var achados = candidatos(q);

    if (!achados.length) {
      /* F3 — o fallback não devolve ao mesmo menu: oferece as duas saídas que
         existem de verdade nesta página. E se um dia o canal de WhatsApp
         ganhar URL, ele entra aqui sozinho — sem promessa escrita à mão. */
      var b = bolha('bot');
      b.classList.add('msg-naosei');
      b.appendChild(el('h5', null, 'Não sei responder isso'));
      b.appendChild(el('p', null,
        'Não tenho isso registrado nesta página, e não vou inventar. Só respondo com o que está ' +
        'no arquivo de dados, e cada resposta vem com a fonte ao lado.'));
      var zap = D.canais.filter(function (c) { return c.id === 'whatsapp' && c.url; })[0];
      b.appendChild(el('p', null, zap
        ? 'Duas saídas: eu te mostro o que tenho sobre a sua cidade, ou você fala com o gabinete no grupo.'
        : 'Duas saídas: eu te mostro o que tenho sobre a sua cidade, ou te levo ao painel do que ' +
          'ainda falta conferir — é lá que as lacunas estão escritas, esta inclusive.'));
      chips(sugestoesIniciais());
      rolar();
      return;
    }

    var principal = achados[0];
    var caixa = bolha('bot');
    if (principal.naoSei) { caixa.classList.add('msg-naosei'); }
    caixa.appendChild(el('h5', null, principal.titulo));
    principal.montar(caixa);

    /* F1 — pergunta composta. A primeira versão daqui respondia o primeiro
       assunto e calava sobre o resto. Omissão silenciosa é pior que "não
       sei": quem perguntou duas coisas e recebeu uma acha que a segunda não
       existe. Agora o segundo assunto é anunciado, com botão. */
    var segundo = achados[1];
    if (segundo) {
      var aviso = el('div', 'msg-tambem');
      aviso.appendChild(el('span', null, 'Você também perguntou sobre'));
      var bt = el('button', 'chip', segundo.titulo);
      bt.type = 'button';
      bt.addEventListener('click', function () { perguntar(segundo.titulo); });
      aviso.appendChild(bt);
      caixa.appendChild(aviso);
    }

    chips(principal.chips || sugestoesIniciais());
    rolar();
  }

  /* ---------- montagem ---------- */

  function montar() {
    corpo = document.getElementById('pergunte-corpo');
    if (!corpo) { return; }
    campo = document.getElementById('pergunte-campo');
    chipsBox = document.getElementById('pergunte-sug');

    document.getElementById('pergunte-enviar').addEventListener('click', function () {
      perguntar(campo.value);
    });
    campo.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); perguntar(campo.value); }
    });

    var abertura = bolha('bot');
    abertura.appendChild(el('p', null,
      'Pergunte o nome da sua cidade, ou escolha abaixo. Respondo só com o que está registrado ' +
      'nesta página, sempre com a fonte — e digo quando não sei.'));
    chips(sugestoesIniciais());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montar);
  } else {
    montar();
  }
}());
