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
 * dados/campanha.js e devolve o registro, com a fonte e a etiqueta ao lado. Se
 * não casar, diz que não sabe e mostra o que sabe responder.
 *
 * A REGRA QUE SUSTENTA TUDO: nenhum número é escrito neste arquivo. Todo
 * número sai de window.CAMPANHA no momento da resposta. O verificador reprova
 * este arquivo se aparecer aqui um número de três dígitos ou mais — porque
 * número escrito no assistente é número que envelhece separado do dado.
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

  var caixa, campo, saida;

  /* ---------- utilidades de resposta ---------- */

  function bloco(titulo) {
    var b = el('div', 'resp');
    if (titulo) { b.appendChild(el('h4', null, titulo)); }
    return b;
  }

  function linha(b, texto) {
    b.appendChild(el('p', null, texto));
    return b;
  }

  /* Toda afirmação sai com a prova colada nela. É a mesma gramática do resto
     da página: se não dá para dizer de onde veio, não vai para a tela. */
  function comProva(b, entrada) {
    if (entrada && entrada.fonte && entrada.etiqueta) {
      b.appendChild(fonteLinha(entrada));
    }
    return b;
  }

  function naoSei(b, oQue) {
    b.classList.add('resp-naosei');
    linha(b, oQue);
    return b;
  }

  /* ---------- os assuntos, na ordem em que são testados ----------
     Do mais específico ao mais geral. Município vem primeiro porque é a
     pergunta que a página existe para responder. */

  function municipio(q) {
    /* Casa contra o índice da busca — o MESMO que o mapa usa. E também contra
       a malha inteira, para "Picos" receber resposta nomeada em vez de cair no
       fallback: vazio com nome é diferente de vazio. */
    var achou = null;
    GN.indice.forEach(function (v, k) {
      if (achou) { return; }
      if (k.length >= 4 && q.indexOf(k) !== -1) { achou = v; }
    });

    if (achou) {
      var b = bloco(achou.nome);
      linha(b, achou.itens.length === 1
        ? 'Há 1 entrega listada aqui, com a fonte ao lado.'
        : 'Há ' + achou.itens.length + ' entregas listadas aqui, cada uma com a fonte ao lado.');
      achou.itens.forEach(function (e) {
        var it = el('div', 'resp-item');
        it.appendChild(el('b', null, e.titulo));
        if (e.destaque) { it.appendChild(el('span', 'resp-num num', e.destaque + ' ' + e.unidade)); }
        it.appendChild(el('p', null, e.contexto));
        comProva(it, e);
        b.appendChild(it);
      });
      b.appendChild(atalho('Ver na busca', function () { GN.buscar(achou.nome); }));
      return b;
    }

    /* Não tem entrega listada — mas é um município do Piauí? */
    var M = window.MAPA_PI;
    var fora = null;
    if (M) {
      M.municipios.forEach(function (m) {
        if (fora) { return; }
        if (m.k.length >= 4 && q.indexOf(m.k) !== -1) { fora = m; }
      });
    }
    if (fora) {
      var c = bloco(fora.n);
      naoSei(c, 'Não há entrega publicada com fonte para ' + fora.n + ' nesta página. ' +
        'Isso não quer dizer que nada chegou lá: quer dizer que o levantamento de ' +
        'emendas por município ainda não foi feito. A busca cobre ' +
        GN.indice.size + ' dos ' + M.total + ' municípios.');
      return c;
    }
    return null;
  }

  function mandato(q) {
    if (!/\b(lei|leis|projeto|mandato|assembleia|alepi|autoria|pec|proposi|decreto|requerimento|deputado estadual)/.test(q)) {
      return null;
    }
    var M = D.mandato;
    if (!M) { return null; }
    var b = bloco('Na Assembleia Legislativa do Piauí');
    linha(b, M.mandatos + ' mandatos, de ' + M.periodo + '.');
    M.itens.forEach(function (i) {
      var it = el('div', 'resp-item');
      it.appendChild(el('span', 'resp-num num', i.valor));
      it.appendChild(el('b', null, i.rotulo));
      it.appendChild(el('p', null, i.nota));
      b.appendChild(it);
    });
    comProva(b, M);
    return b;
  }

  function emendas(q) {
    if (!/\bemenda/.test(q)) { return null; }
    var b = bloco('Emendas');
    naoSei(b, 'O levantamento de emendas por município não foi feito, e por isso não há ' +
      'nenhum valor de emenda nesta página. O dado existe: mora no Portal da Transparência ' +
      'do Piauí e na lei orçamentária do estado. É o item de maior retorno da lista de ' +
      'pendências — é ele que tiraria o mapa de ' + GN.indice.size + ' municípios marcados ' +
      'para perto do total do estado.');
    linha(b, 'Prefiro dizer isto a mostrar um número que ninguém conferiu.');
    return b;
  }

  function votos(q) {
    if (!/\b(voto|votac|eleic|elei[cç]|urna|mais votado)/.test(q)) { return null; }
    var ano = (q.match(/\b(20\d\d)\b/) || [])[1];
    var lista = ano ? D.votos.filter(function (v) { return String(v.ano) === ano; }) : D.votos;
    if (!lista.length) { lista = D.votos; }
    var b = bloco(lista.length === 1 ? 'Votação de ' + lista[0].ano : 'As três votações');
    lista.forEach(function (v) {
      var it = el('div', 'resp-item');
      it.appendChild(el('span', 'resp-num num', v.valor));
      it.appendChild(el('b', null, 'votos em ' + v.ano));
      it.appendChild(el('p', null, v.legenda));
      comProva(it, v);
      b.appendChild(it);
    });
    return b;
  }

  function pauta(q) {
    var achou = null;
    D.pautas.forEach(function (p) {
      if (achou) { return; }
      /* Casa pelo nome da pauta e por qualquer palavra dele com 4 letras ou
         mais. "água" acha "Água Todo Dia" sem lista de sinônimos escrita à
         mão — lista de sinônimos envelhece longe do dado que ela serve. */
      var termos = chave(p.nome).split(/[^a-z0-9]+/).filter(function (t) { return t.length >= 4; });
      if (termos.some(function (t) { return q.indexOf(t) !== -1; })) { achou = p; }
    });
    if (!achou) { return null; }

    var b = bloco(achou.nome);
    linha(b, achou.promessa);

    var ligadas = D.entregas.filter(function (e) { return e.publicar && e.pauta === achou.id; });
    if (ligadas.length) {
      linha(b, ligadas.length === 1
        ? 'Há 1 entrega listada nesta pauta:'
        : 'Há ' + ligadas.length + ' entregas listadas nesta pauta:');
      ligadas.forEach(function (e) {
        var it = el('div', 'resp-item');
        it.appendChild(el('b', null, e.titulo));
        if (e.cidades.length) { it.appendChild(el('p', null, e.cidades.join(' · '))); }
        comProva(it, e);
        b.appendChild(it);
      });
    } else {
      naoSei(b, 'Esta é uma pauta de compromisso, e não uma entrega: não há nada listado ' +
        'aqui como já realizado. Promessa não precisa de prova; entrega precisa.');
    }
    return b;
  }

  function cobertura(q) {
    if (!/\b(quantas cidades|quantos municipios|cobertura|todo o estado|mapa|abrangencia)/.test(q)) {
      return null;
    }
    var M = window.MAPA_PI;
    var b = bloco('Cobertura da página');
    linha(b, GN.indice.size + ' dos ' + (M ? M.total : D.legal.uf) +
      ' municípios do Piauí têm pelo menos uma entrega listada aqui, com fonte. ' +
      'O mapa acima marca esses, e o branco não quer dizer que nada chegou lá — ' +
      'quer dizer que não há entrega publicada com fonte.');
    return b;
  }

  function quemE(q) {
    if (!/\b(quem e|quem ele|idade|quantos anos|partido|numero|cargo|candidato a|concorre)/.test(q)) {
      return null;
    }
    var L = D.legal;
    var b = bloco('Quem é');
    linha(b, 'Candidato a ' + L.cargo + ' pelo ' + L.partido + ' no ' + L.uf +
      ', na eleição de ' + L.eleicao + '. O número é ' + L.numero + '.');
    linha(b, 'A biografia inteira está na seção "Quem é" desta página, e o que ele fez na ' +
      'Assembleia está na seção "Mandato".');
    return b;
  }

  function canais(q) {
    /* "falar com" não bastava: a pessoa escreve "como falo com ele". Casar a
       forma exata de um verbo é o jeito mais rápido de um assistente parecer
       burro — o radical cobre falo, fala, falar, falei. */
    if (!/\b(contato|whatsapp|instagram|facebook|youtube|rede social|redes|fal(o|a|ar|ei|e) com|grupo|segu(ir|e)|acompanh)/.test(q)) {
      return null;
    }
    var vivos = D.canais.filter(function (c) { return c.url; });
    var b = bloco('Onde acompanhar');
    linha(b, vivos.length + ' de ' + D.canais.length + ' canais com endereço confirmado.');
    D.canais.forEach(function (c) {
      var it = el('div', 'resp-item');
      it.appendChild(el('b', null, c.rotulo));
      if (c.url) {
        var a = el('a', null, c.arroba || 'abrir');
        a.href = c.url; a.rel = 'noopener noreferrer'; a.target = '_blank';
        it.appendChild(a);
      } else {
        it.appendChild(el('p', null, c.pendencia));
      }
      b.appendChild(it);
    });
    return b;
  }

  function material(q) {
    if (!/\b(material|moldura|baixar|download|adesivo|santinho|foto de perfil|divulgar|logotipo)/.test(q)) {
      return null;
    }
    var lista = D.materiais || [];
    var prontos = lista.filter(function (m) { return m.modo; });
    var b = bloco('Material para baixar');
    linha(b, prontos.length + ' de ' + lista.length + ' itens disponíveis agora. ' +
      'O resto diz o que falta e quem produz.');
    lista.forEach(function (m) {
      var it = el('div', 'resp-item');
      it.appendChild(el('b', null, m.titulo));
      it.appendChild(el('p', null, m.modo ? m.formato : m.pendencia));
      b.appendChild(it);
    });
    return b;
  }

  function pendencias(q) {
    if (!/\b(pendencia|falta|conferi|fonte|prova|liberad|publicar|barrad|confia)/.test(q)) {
      return null;
    }
    var travam = D.pendencias.filter(function (p) { return p.grau === 'bloqueia'; });
    var b = bloco('O que ainda não foi conferido');
    linha(b, travam.length + ' pendências bloqueiam a publicação desta página, e elas estão ' +
      'listadas por extenso no painel do fim. A página se declara não liberada enquanto ' +
      'houver uma.');
    travam.forEach(function (p) {
      var it = el('div', 'resp-item');
      it.appendChild(el('b', null, p.item));
      b.appendChild(it);
    });
    return b;
  }

  /* ---------- montagem ---------- */

  function atalho(rotulo, fn) {
    var b = el('button', 'resp-atalho', rotulo);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  var ASSUNTOS = [municipio, mandato, emendas, votos, pauta, cobertura, quemE, canais, material, pendencias];

  function responder(texto) {
    saida.textContent = '';
    var q = chave(texto);

    if (!q) {
      saida.appendChild(naoSei(bloco(null), 'Escreva uma pergunta — o nome da sua cidade já basta.'));
      return;
    }

    for (var i = 0; i < ASSUNTOS.length; i++) {
      var r = ASSUNTOS[i](q);
      if (r) { saida.appendChild(r); saida.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
    }

    /* O fallback não é um encolher de ombros: diz o que ele sabe responder.
       Assistente que só diz "não entendi" ensina a pessoa a desistir. */
    var b = bloco('Não sei responder isso');
    naoSei(b, 'Só respondo com o que está escrito nesta página, e cada resposta vem com a ' +
      'fonte ao lado. Não invento — se o dado não existe aqui, eu digo que não existe.');
    linha(b, 'Dá para perguntar sobre: o nome da sua cidade, o que ele fez na Assembleia, ' +
      'as votações, as cinco pautas, emendas, material para baixar, os canais, e o que ' +
      'ainda falta conferir.');
    saida.appendChild(b);
  }

  function montar() {
    caixa = document.getElementById('pergunte-caixa');
    if (!caixa) { return; }
    campo = document.getElementById('pergunte-campo');
    saida = document.getElementById('pergunte-saida');

    document.getElementById('pergunte-enviar').addEventListener('click', function () {
      responder(campo.value);
    });
    campo.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); responder(campo.value); }
    });

    /* As sugestões saem do dado: o município com mais entregas, a primeira
       pauta, o ano da última votação. Sugestão escrita à mão vira mentira no
       dia em que o dado muda. */
    var maior = null;
    GN.indice.forEach(function (v) {
      if (!maior || v.itens.length > maior.itens.length) { maior = v; }
    });
    var ultima = D.votos[D.votos.length - 1];

    var sugestoes = [
      'O que chegou em ' + (maior ? maior.nome : D.legal.uf) + '?',
      'Quantas leis ele fez?',
      'E emendas?',
      'Quantos votos em ' + (ultima ? ultima.ano : D.legal.eleicao) + '?',
      D.pautas[0] ? 'O que é ' + D.pautas[0].nome + '?' : 'O que falta conferir?',
      'O que ainda falta conferir?'
    ];
    var alvo = document.getElementById('pergunte-sug');
    sugestoes.forEach(function (s) {
      alvo.appendChild(atalho(s, function () { campo.value = s; responder(s); }));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montar);
  } else {
    montar();
  }
}());
