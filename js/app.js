/* Georgiano 5555 — montagem da home a partir de dados/campanha.js
 *
 * Duas regras de construção que valem para tudo aqui:
 *  1. Texto de dado nunca é concatenado em innerHTML. Vai por textContent,
 *     sempre. Aspas em nome de povoado não têm como quebrar atributo.
 *  2. Nada é descartado em silêncio. Busca sem resultado diz o que não achou;
 *     entrega barrada não some, aparece contada no rodapé de verificação.
 *
 * Riva's Alexandre · 31/08/2026
 */
(function () {
  'use strict';

  var D = window.CAMPANHA;
  if (!D) { throw new Error('dados/campanha.js não carregou — a página não pode ser montada.'); }

  /* ---------- utilidades ---------- */

  function el(tag, classe, texto) {
    var n = document.createElement(tag);
    if (classe) { n.className = classe; }
    if (texto !== undefined && texto !== null) { n.textContent = texto; }
    return n;
  }

  function achar(sel) {
    var n = document.querySelector(sel);
    if (!n) { throw new Error('marcador ausente na página: ' + sel); }
    return n;
  }

  /* "São Raimundo Nonato" -> "sao raimundo nonato" */
  function chave(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  function fonteLinha(entrada) {
    var p = el('small', 'fonte');
    var a = el('a', null, entrada.fonte.nome);
    a.href = entrada.fonte.url;
    a.rel = 'noopener noreferrer';
    a.target = '_blank';
    p.appendChild(a);
    p.appendChild(el('span', 'etiq etiq-' + entrada.etiqueta, entrada.etiqueta));
    return p;
  }

  /* ---------- A · barra de estado da página ---------- */
  /* Enquanto o CNPJ não estiver conferido, a página inteira sai marcada como
   * não liberada. É o mais perto de "barrar" que uma página estática chega:
   * ninguém publica isto sem ver. O verificador é quem barra de verdade. */

  function barraEstado() {
    var barra = achar('#estado');
    var travas = D.pendencias.filter(function (p) { return p.grau === 'bloqueia'; });

    if (D.legal.cnpjConfirmado && travas.length === 0) {
      barra.className = 'nota liberada';
      barra.textContent = 'Conteúdo conferido · liberado para publicação';
      return;
    }
    barra.className = 'nota barrada';
    barra.textContent = 'Não liberado para publicação — ' + travas.length +
      (travas.length === 1 ? ' pendência bloqueia' : ' pendências bloqueiam') +
      ' · ver o painel no fim da página';
  }

  /* ---------- marcadores de foto ---------- */
  /* Marcador anônimo não vira pedido, vira esquecimento. Cada um diz qual foto
     é, se ela existe no acervo, e o post de referência para pedir o original. */

  /* Aceita mais de um slot: usa o primeiro que existir. Serve para a foto
     própria da obra ter precedência sobre a foto genérica da pauta. */
  function foto() {
    var pedidos = Array.prototype.slice.call(arguments);
    var f = null;
    for (var i = 0; i < pedidos.length && !f; i++) {
      f = D.fotos.filter(function (x) { return x.slot === pedidos[i]; })[0] || null;
    }
    var caixa = el('div', 'ph');

    if (!f) {
      caixa.appendChild(el('i', null, 'Slot de foto sem definição: ' + pedidos.join(' → ')));
      caixa.classList.add('ph-erro');
      return caixa;
    }
    if (f.arquivo) {
      var img = document.createElement('img');
      img.src = f.arquivo;
      img.alt = f.titulo;
      caixa.className = 'ph ph-cheia';
      /* Arquivo pequeno demais para o quadro. Esticar 4× entrega borrão e
         parece defeito; centrar no azul da marca, no tamanho que o arquivo
         aguenta, parece decisão — e é a única honesta enquanto o original
         não chega. */
      if (f.mini) { caixa.classList.add('ph-mini'); }
      caixa.appendChild(img);
      /* Foto provisória sem tarja é foto aprovada aos olhos de quem abre a
         degustação — e é assim que imagem de referência vira imagem publicada
         sem ninguém decidir. A tarja diz o que é e por quê, na própria foto. */
      if (f.provisoria) {
        caixa.classList.add('ph-provisoria');
        var tarja = el('span', 'ph-tarja');
        tarja.appendChild(el('b', null, 'foto provisória'));
        tarja.appendChild(el('em', null, f.provisoria));
        caixa.appendChild(tarja);
      }
      return caixa;
    }

    caixa.classList.add(f.acervo ? 'ph-escolhida' : 'ph-semacervo');
    var t = el('i');
    t.appendChild(el('b', null, f.titulo));
    t.appendChild(el('span', null, f.descricao));
    if (f.post) {
      var a = el('a', null, 'ver referência no perfil');
      a.href = f.post; a.rel = 'noopener noreferrer'; a.target = '_blank';
      t.appendChild(a);
    } else {
      t.appendChild(el('span', 'urgente', 'sem foto no acervo — pedir à assessoria'));
    }
    caixa.appendChild(t);
    return caixa;
  }

  function fotosFixas() {
    ['hero', 'bio'].forEach(function (slot) {
      var alvo = achar('#foto-' + slot);
      alvo.replaceWith(foto(slot));
    });
    achar('#foto-avatar').appendChild(foto('avatar'));
  }

  /* ---------- C · números de autoridade ---------- */

  function numeros() {
    var alvo = achar('#nums');
    D.votos.forEach(function (v) {
      var bloco = el('div');
      bloco.appendChild(el('strong', 'num', v.valor));
      bloco.appendChild(el('p', null, 'votos em ' + v.ano + ' — ' + v.legenda));
      bloco.appendChild(fonteLinha(v));
      alvo.appendChild(bloco);
    });
  }

  /* ---------- D · cartões de entrega ---------- */

  function cartao(e) {
    var art = el('article', 'card');

    /* Foto própria da obra quando houver; senão a da pauta. Hoje as quatro
       entregas de "estrada de produção" caem todas na mesma imagem — está
       registrado nas pendências, e o dia em que chegar foto de Várzea Queimada
       basta acrescentar o slot 'obra:varzea-queimada-asfalto'. */
    art.appendChild(foto('obra:' + e.id, 'entrega:' + e.pauta));

    var dentro = el('div', 'in');
    dentro.appendChild(el('span', 'tag', e.tag));
    dentro.appendChild(el('h3', null, e.titulo));
    if (e.cidades.length) {
      /* Nome, lugar, coisa. Contagem sozinha ("17 municípios") já está no destaque
         ao lado; aqui vale mais mostrar município de verdade. */
      var mostra = e.cidades.slice(0, 3).join(' · ');
      var resto = e.cidades.length - 3;
      dentro.appendChild(el('p', 'cid', resto > 0 ? mostra + ' e mais ' + resto : mostra));
    } else {
      dentro.appendChild(el('p', 'cid semlugar', 'Municípios não nomeados na fonte'));
    }
    dentro.appendChild(el('p', 'ctx', e.contexto));

    var val = el('div', 'val');
    if (e.destaque) {
      val.appendChild(el('b', 'num', e.destaque));
      val.appendChild(el('span', null, e.unidade));
    } else {
      val.appendChild(el('span', 'semvalor', 'Valor não publicado — sem fonte'));
    }
    dentro.appendChild(val);

    dentro.appendChild(fonteLinha(e));
    if (e.ressalva) { dentro.appendChild(el('p', 'ressalva', e.ressalva)); }

    art.appendChild(dentro);
    return art;
  }

  function entregas() {
    var alvo = achar('#entregas');
    var visiveis = D.entregas.filter(function (e) { return e.publicar; });
    visiveis.forEach(function (e) { alvo.appendChild(cartao(e)); });

    var barradas = D.entregas.length - visiveis.length;
    if (barradas > 0) {
      achar('#entregas-nota').textContent = barradas +
        (barradas === 1
          ? ' entrega está fora desta lista por pendência de crédito ou de fonte.'
          : ' entregas estão fora desta lista por pendência de crédito ou de fonte.') +
        ' Elas continuam registradas em dados/campanha.js e aparecem no painel de verificação.';
    }
  }

  /* ---------- B · busca por município ---------- */

  var indice = null;

  function montarIndice() {
    indice = new Map();
    D.entregas.filter(function (e) { return e.publicar; }).forEach(function (e) {
      e.cidades.forEach(function (c) {
        var k = chave(c);
        if (!indice.has(k)) { indice.set(k, { nome: c, itens: [] }); }
        indice.get(k).itens.push(e);
      });
    });
  }

  function buscar(termo) {
    var saida = achar('#resultado');
    saida.textContent = '';
    var k = chave(termo);

    if (!k) {
      saida.appendChild(el('p', 'vazio', 'Digite o nome de um município do Piauí.'));
      return;
    }

    var achados = [];
    indice.forEach(function (v, kk) { if (kk.indexOf(k) === 0) { achados.push(v); } });
    if (!achados.length) {
      indice.forEach(function (v, kk) { if (kk.indexOf(k) > 0) { achados.push(v); } });
    }

    if (!achados.length) {
      var box = el('div', 'vazio');
      box.appendChild(el('p', null,
        'Ainda não há entrega publicada com fonte para "' + termo.trim() + '".'));
      box.appendChild(el('p', 'miudo',
        'Esta busca cobre hoje ' + indice.size + ' dos 224 municípios do Piauí. ' +
        'Não significa que nada chegou lá — significa que o levantamento de emendas por ' +
        'município ainda não foi entregue pelo gabinete.'));
      saida.appendChild(box);
      return;
    }

    achados.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
    achados.forEach(function (c) {
      var grupo = el('div', 'cidade');
      var cab = el('h3', null, c.nome);
      cab.appendChild(el('span', 'conta', c.itens.length === 1 ? '1 entrega' : c.itens.length + ' entregas'));
      grupo.appendChild(cab);
      c.itens.forEach(function (e) {
        var li = el('div', 'linha');
        li.appendChild(el('span', 'tag', e.tag));
        li.appendChild(el('p', null, e.titulo));
        li.appendChild(fonteLinha(e));
        grupo.appendChild(li);
      });
      saida.appendChild(grupo);
    });
  }

  function busca() {
    montarIndice();
    var campo = achar('#campo-cidade');
    var botao = achar('#campo-buscar');

    achar('#busca-abrangencia').textContent =
      'São 224 municípios no Piauí. ' + indice.size + ' já têm entrega listada aqui, ' +
      'cada uma com a fonte ao lado. O resto depende do levantamento de emendas por município.';

    botao.addEventListener('click', function () { buscar(campo.value); });
    campo.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); buscar(campo.value); }
    });

    /* Sugestão em ordem alfabética joga oito municípios pequenos na cara de quem
       chega. Quem tem mais entrega listada vai primeiro — é o que dá o exemplo
       mais útil de como a busca responde. */
    var sug = achar('#sugestoes');
    var nomes = [];
    indice.forEach(function (v) { nomes.push(v); });
    nomes.sort(function (a, b) {
      return (b.itens.length - a.itens.length) || a.nome.localeCompare(b.nome, 'pt-BR');
    });
    nomes = nomes.map(function (v) { return v.nome; });
    nomes.slice(0, 8).forEach(function (n) {
      var b = el('button', null, n);
      b.type = 'button';
      b.addEventListener('click', function () { campo.value = n; buscar(n); });
      sug.appendChild(b);
    });
  }

  /* ---------- B2 · mapa do Piauí por município ----------
     A malha é local (dados/mapa-piaui.js, baixada uma vez do IBGE). O que
     acende sai do MESMO índice da busca — se um dia o mapa e a busca
     discordarem sobre um nome, é porque alguém montou dois índices.

     O mapa de campanha tem um risco próprio: 19 de 224 pintados leem como
     "ele atuou aqui e não ali". Não é o que o dado diz. O que o dado diz é
     que 19 têm entrega publicada COM FONTE, e é isso que a legenda afirma —
     em texto, não em cor. */

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs) {
    var n = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    }
    return n;
  }

  function mapa() {
    var alvo = achar('#mapa-tela');
    var lista = achar('#mapa-lista');
    var M = window.MAPA_PI;

    if (!M || !M.municipios || !M.municipios.length) {
      /* Sem malha, o bloco diz o que falta em vez de deixar um buraco. */
      alvo.appendChild(el('p', 'mapa-erro',
        'A malha municipal (dados/mapa-piaui.js) não carregou — o mapa não pode ser desenhado.'));
      achar('#mapa-intro').textContent = '';
      return;
    }

    var campo = achar('#campo-cidade');
    var marcados = 0;

    var svg = svgEl('svg', {
      viewBox: M.viewBox,
      role: 'group',
      'aria-label': 'Mapa do Piauí dividido pelos ' + M.total + ' municípios, ' +
                    'com os que têm entrega listada em destaque'
    });

    function irPara(nome) {
      campo.value = nome;
      buscar(nome);
      var r = document.getElementById('resultado');
      if (r) { r.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }

    M.municipios.forEach(function (m) {
      var dado = indice.get(m.k);
      var p = svgEl('path', { d: m.d, class: dado ? 'am-tem' : 'am-sem' });
      var t = svgEl('title');

      if (dado) {
        marcados++;
        var n = dado.itens.length;
        t.textContent = m.n + ' — ' + n + (n === 1 ? ' entrega listada' : ' entregas listadas');
        p.setAttribute('tabindex', '0');
        p.setAttribute('role', 'button');
        p.setAttribute('aria-label', t.textContent + '. Ver na busca.');
        p.addEventListener('click', function () { irPara(dado.nome); });
        p.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); irPara(dado.nome); }
        });
      } else {
        t.textContent = m.n + ' — sem entrega publicada com fonte';
      }
      p.appendChild(t);
      svg.appendChild(p);
    });

    alvo.appendChild(svg);

    achar('#mapa-intro').textContent =
      marcados + ' dos ' + M.total + ' municípios do Piauí têm pelo menos uma entrega ' +
      'listada nesta página, com a fonte ao lado. Toque num município marcado para ver o que está listado.';

    /* A lista existe por dois motivos: dá o nome do que o mapa só dá em cor,
       e é o caminho de quem navega por teclado sem caçar 19 formas na malha. */
    var nomes = [];
    indice.forEach(function (v) { nomes.push(v); });
    nomes.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
    nomes.forEach(function (v) {
      var b = el('button', null, v.nome);
      b.type = 'button';
      b.appendChild(el('span', 'conta', String(v.itens.length)));
      b.addEventListener('click', function () { irPara(v.nome); });
      lista.appendChild(b);
    });
  }

  /* ---------- E2 · mandato na ALEPI ----------
     A ordem dos itens é editorial e está no dado, não aqui: o que virou lei
     primeiro, o volume por último. Site de campanha que abre com "336
     matérias" está inflando — 79% são requerimento, que é rotina. A nota de
     cada cartão é o que impede o número de ser lido como mais do que é. */

  function mandato() {
    var M = D.mandato;
    var grade = achar('#mandato-grade');

    achar('#mandato-intro').textContent =
      M.mandatos + (M.mandatos === 1 ? ' mandato' : ' mandatos') + ' na ' + M.casa +
      ', de ' + M.periodo + '. Os números abaixo saem do SAPL, o sistema oficial da ' +
      'Assembleia — cada um com o que ele quer dizer escrito ao lado.';

    M.itens.forEach(function (i) {
      var c = el('div', 'mand mand-' + i.chave);
      c.appendChild(el('b', 'n num', i.valor));
      c.appendChild(el('h4', null, i.rotulo));
      c.appendChild(el('p', null, i.nota));
      grade.appendChild(c);
    });

    /* A fonte do bloco inteiro, uma vez, com a etiqueta — mesma gramática de
       prova do resto da página. */
    var f = achar('#mandato-fonte');
    var a = el('a', null, M.fonte.nome);
    a.href = M.fonte.url;
    a.rel = 'noopener noreferrer';
    a.target = '_blank';
    f.appendChild(el('span', null, 'Fonte de todos os números acima: '));
    f.appendChild(a);
    f.appendChild(el('span', 'etiq etiq-' + M.etiqueta, M.etiqueta));
  }

  /* ---------- F · compromissos (as cinco pautas nomeadas) ---------- */

  function pautas() {
    var alvo = achar('#pautas');
    D.pautas.forEach(function (p, i) {
      var bloco = el('div', 'meta');
      bloco.appendChild(el('div', 'n num', String(i + 1).padStart(2, '0')));
      bloco.appendChild(el('h4', null, p.nome));
      bloco.appendChild(el('p', null, p.promessa));
      alvo.appendChild(bloco);
    });
  }

  /* ---------- a moldura da campanha, desenhada num contexto qualquer ----------
     Absorvido de moldurageorgiano5555.html em 01/09/2026, que tinha três
     formatos, quatro estilos e enquadramento — e tinha também a paleta que
     saiu naquele mesmo dia, com verde e dourado usados como cor de moldura.
     Aqui as quatro molduras foram redesenhadas na paleta medida: azul de
     sistema, azul de ação, e o destaque por escala e peso em vez de matiz.

     Uma implementação só, usada em três lugares — o gerador desta seção, as
     miniaturas dos estilos e o PNG transparente da seção Divulgar. Duas
     cópias do mesmo desenho divergem no primeiro ajuste de cor, e foi
     exatamente o que aconteceu com o arquivo absorvido. */

  var C = {
    azul: '#001787', topo: '#02208E', acao: '#0072CB',
    papel: '#F2F5FA', claro: '#CEDCEF', branco: '#FFFFFF'
  };

  var FORMATOS = [
    ['perfil', 'Perfil', 1080, 1080],
    ['story', 'Story', 1080, 1920],
    ['feed', 'Feed', 1080, 1350]
  ];

  var ESTILOS = [
    ['faixa', 'Faixa'], ['anel', 'Anel'], ['quadro', 'Quadro'], ['limpo', 'Limpo']
  ];

  var FRASES = [
    ['', 'Sem frase'], ['EU VOTO', 'Eu voto'], ['COM GEORGIANO', 'Com Georgiano'],
    ['DEPUTADO FEDERAL', 'Deputado Federal'], ['PIAUÍ NO MAPA', 'Piauí no mapa']
  ];

  function fonte(ctx, peso, tam, esp) {
    ctx.font = peso + ' ' + tam + 'px Archivo, system-ui, sans-serif';
    /* letterSpacing no canvas é recente e não existe em todo navegador. Onde
       não existir, o texto sai sem entreletra e nada quebra — por isso o
       try, e por isso toda medida de largura usa measureText depois disto. */
    try { ctx.letterSpacing = (esp || 0) + 'px'; } catch (e) { ctx.letterSpacing = '0px'; }
  }

  function retanguloRedondo(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* A faixa canônica: a mesma que a trava de tela confere por pixel no canto.
     Recebe W e H para servir aos três formatos; em quadrado é idêntica ao que
     já estava no ar. */
  function faixaEm(ctx, W, H) {
    if (H === undefined) { H = W; }
    var u = W / 1080;
    var h = Math.round(Math.min(W, H) * 0.115);
    ctx.fillStyle = C.azul;
    ctx.fillRect(0, H - h, W, h);
    fonte(ctx, '800', Math.round(h * 0.60), 0);
    ctx.fillStyle = C.branco;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('5555', Math.round(W * 0.045), H - h / 2);
    fonte(ctx, '600', Math.round(h * 0.24), 2 * u);
    ctx.fillStyle = C.papel;
    ctx.textAlign = 'right';
    ctx.fillText('GEORGIANO · DEPUTADO FEDERAL', W - Math.round(W * 0.045), H - h / 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = C.acao;
    ctx.fillRect(0, H - h - 8 * u, W, 8 * u);
  }

  /* Lockup em uma tinta só. O arquivo absorvido separava "GEORGIANO" de
     "5555" por cor — papel e dourado. Dourado fora do símbolo é a regra que
     esta paleta proíbe, então a separação passou a ser de peso e corpo, que é
     o que o resto do site faz desde a medição. */
  function lockup(ctx, cx, base, corpo, esp, alinhar) {
    fonte(ctx, '600', corpo, esp);
    var a = ctx.measureText('GEORGIANO ').width;
    fonte(ctx, '800', corpo * 1.06, esp);
    var b = ctx.measureText('5555').width;
    var t = a + b;
    var x = alinhar === 'centro' ? cx - t / 2 : alinhar === 'direita' ? cx - t : cx;
    ctx.fillStyle = C.branco;
    fonte(ctx, '600', corpo, esp);
    ctx.fillText('GEORGIANO ', x, base);
    fonte(ctx, '800', corpo * 1.06, esp);
    ctx.fillText('5555', x + a, base);
    return t;
  }

  function frase(ctx, texto, x, y, corpo, esp, alinhar) {
    if (!texto) { return; }
    fonte(ctx, '700', corpo, esp);
    ctx.fillStyle = C.claro;
    var w = ctx.measureText(texto).width;
    ctx.fillText(texto, alinhar === 'centro' ? x - w / 2 : alinhar === 'direita' ? x - w : x, y);
  }

  /* ---------- J · divulgar: material e canais ---------- */

  function baixarTela(tela, nome) {
    var a = document.createElement('a');
    a.download = nome;
    a.href = tela.toDataURL('image/png');
    a.click();
  }

  function materiais() {
    var alvo = achar('#materiais');
    var lista = D.materiais || [];
    var prontos = lista.filter(function (m) { return m.modo; });

    achar('#mat-intro').textContent = prontos.length + ' de ' + lista.length +
      ' itens disponíveis agora. Os demais dizem o que falta e quem produz — ' +
      'cartão sem arquivo nunca vira botão que não baixa.';

    lista.forEach(function (m) {
      var c = el('article', 'card mat');
      var dentro = el('div', 'in');
      dentro.appendChild(el('span', 'tag', m.formato));
      dentro.appendChild(el('h3', null, m.titulo));
      dentro.appendChild(el('p', 'ctx', m.descricao));

      if (m.modo === 'ancora') {
        var link = el('a', 'btn mat-acao', 'Ir para o gerador');
        link.href = m.alvo;
        dentro.appendChild(link);

      } else if (m.modo === 'gerar') {
        var bt = el('button', 'btn mat-acao', 'Gerar e baixar');
        bt.type = 'button';
        var recado = el('p', 'mat-recado');
        bt.addEventListener('click', function () {
          var LADO = 1080;
          var tela = document.createElement('canvas');
          tela.width = LADO; tela.height = LADO;
          /* Sem preencher o fundo: o canvas nasce transparente e é isso que
             se quer aqui. Preencher com a cor do papel entregaria um quadrado
             branco onde a pessoa espera recorte. */
          faixaEm(tela.getContext('2d'), LADO);
          baixarTela(tela, 'moldura-5555-vazia.png');
          recado.textContent = 'Pronto. O arquivo foi montado no seu navegador — nada foi enviado.';
        });
        dentro.appendChild(bt);
        dentro.appendChild(recado);

      } else if (m.arquivo) {
        var d = el('a', 'btn mat-acao', 'Baixar');
        d.href = m.arquivo;
        d.setAttribute('download', '');
        dentro.appendChild(d);

      } else {
        c.classList.add('mat-falta');
        var av = el('p', 'mat-pendencia');
        av.appendChild(el('b', null, 'ainda não disponível'));
        av.appendChild(el('span', null, m.pendencia));
        dentro.appendChild(av);
      }

      c.appendChild(dentro);
      alvo.appendChild(c);
    });
  }

  function canais() {
    var alvo = achar('#canais');
    var lista = D.canais;
    var vivos = lista.filter(function (c) { return c.url; });

    achar('#canais-intro').textContent = vivos.length + ' de ' + lista.length +
      ' canais com endereço confirmado. Os outros aparecem com o motivo ao lado — ' +
      'canal sem URL não vira link morto.';

    lista.forEach(function (c) {
      var li = el('li');
      var nome = el('b', null, c.rotulo);
      li.appendChild(nome);
      if (c.arroba) { li.appendChild(el('span', 'arroba', c.arroba)); }

      if (c.url) {
        var a = el('a', 'canal-abrir', 'Abrir');
        a.href = c.url;
        a.rel = 'noopener noreferrer';
        a.target = '_blank';
        a.setAttribute('aria-label', 'Abrir ' + c.rotulo + ' (abre em outra aba)');
        li.appendChild(a);
      } else {
        /* Mesmo tratamento do rodapé: o motivo é o conteúdo, não um balão.
           Span com aria-disabled em vez de <a> sem href — <a> sem href não é
           anunciado como nada. */
        var off = el('span', 'canal-off', 'sem endereço');
        off.setAttribute('aria-disabled', 'true');
        li.appendChild(off);
        li.appendChild(el('span', 'canal-porque', c.pendencia));
      }
      alvo.appendChild(li);
    });
  }


  /* ---------- I · moldura 5555 ---------- */
  /* A foto não sai do navegador: nada de upload, nada de servidor. */

  function moldura() {
    var entrada = achar('#mold-arquivo');
    var tela = achar('#mold-tela');
    var baixar = achar('#mold-baixar');
    var compartilhar = achar('#mold-compartilhar');
    var aviso = achar('#mold-aviso');
    var zoom = achar('#mold-zoom');
    var girar = achar('#mold-girar');
    var centrar = achar('#mold-centrar');

    var E = {
      img: null, formato: FORMATOS[0], estilo: 'faixa', frase: '',
      zoom: 1, dx: 0, dy: 0, giro: 0
    };
    var ultimoBlob = null;
    var miniaturas = [];

    /* Exemplo desenhado em código: a seção nunca aparece vazia, e o exemplo
       não custa arquivo nenhum. */
    var exemplo = document.createElement('canvas');
    exemplo.width = 900; exemplo.height = 900;
    (function () {
      var d = exemplo.getContext('2d');
      var g = d.createLinearGradient(0, 0, 0, 900);
      g.addColorStop(0, C.topo); g.addColorStop(1, C.azul);
      d.fillStyle = g; d.fillRect(0, 0, 900, 900);
      d.fillStyle = 'rgba(206,220,239,.30)';
      d.beginPath(); d.arc(450, 350, 150, 0, Math.PI * 2); d.fill();
      d.beginPath(); d.moveTo(140, 900);
      d.bezierCurveTo(160, 640, 320, 550, 450, 550);
      d.bezierCurveTo(580, 550, 740, 640, 760, 900);
      d.closePath(); d.fill();
      d.fillStyle = 'rgba(242,245,250,.72)';
      fonte(d, '700', 30, 6);
      d.textAlign = 'center';
      d.fillText('EXEMPLO', 450, 120);
      d.textAlign = 'left';
    })();

    function desenharFoto(ctx, W, H) {
      var s = E.img || exemplo;
      var iw = s.naturalWidth || s.width, ih = s.naturalHeight || s.height;
      var vira = (E.giro % 180) !== 0;
      var lw = vira ? ih : iw, lh = vira ? iw : ih;
      var k = Math.max(W / lw, H / lh) * E.zoom;
      var maxX = Math.max(0, (lw * k - W) / 2), maxY = Math.max(0, (lh * k - H) / 2);
      ctx.save();
      ctx.translate(W / 2 + E.dx * maxX, H / 2 + E.dy * maxY);
      ctx.rotate(E.giro * Math.PI / 180);
      ctx.drawImage(s, -iw * k / 2, -ih * k / 2, iw * k, ih * k);
      ctx.restore();
    }

    /* As quatro molduras, todas na paleta medida. Nenhuma usa verde nem
       dourado: são do símbolo, e o símbolo não está aqui. */
    var DESENHOS = {

      faixa: function (ctx, W, H, u) {
        desenharFoto(ctx, W, H);
        var alt = Math.min(W, H) * 0.115;
        /* Véu por cima da foto antes da faixa: sem ele, foto clara encosta
           na faixa e o corte fica duro. */
        var g = ctx.createLinearGradient(0, H - alt * 2.6, 0, H - alt);
        g.addColorStop(0, 'rgba(0,23,135,0)');
        g.addColorStop(1, 'rgba(0,23,135,.85)');
        ctx.fillStyle = g;
        ctx.fillRect(0, H - alt * 2.6, W, alt * 1.6);
        frase(ctx, E.frase, 48 * u, H - alt - 34 * u, 30 * u, 7 * u, 'esquerda');
        faixaEm(ctx, W, H);
      },

      anel: function (ctx, W, H, u) {
        var quadrado = Math.abs(W - H) < 1;
        var anel = 34 * u, recuo = 18 * u;
        var r = Math.min(W, H) / 2 - recuo - anel / 2;
        ctx.fillStyle = C.azul; ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.beginPath();
        if (quadrado) { ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); }
        else { retanguloRedondo(ctx, recuo + anel / 2, recuo + anel / 2,
                 W - 2 * (recuo + anel / 2), H - 2 * (recuo + anel / 2), 54 * u); }
        ctx.clip(); desenharFoto(ctx, W, H); ctx.restore();

        var g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, C.topo); g.addColorStop(1, C.acao);
        ctx.lineWidth = anel; ctx.strokeStyle = g;
        ctx.beginPath();
        if (quadrado) { ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); }
        else { retanguloRedondo(ctx, recuo + anel / 2, recuo + anel / 2,
                 W - 2 * (recuo + anel / 2), H - 2 * (recuo + anel / 2), 54 * u); }
        ctx.stroke();

        var corpo = 52 * u, altP = 104 * u;
        ctx.textBaseline = 'middle';
        fonte(ctx, '600', corpo, 2 * u);
        var largura = ctx.measureText('GEORGIANO ').width;
        fonte(ctx, '800', corpo * 1.06, 2 * u);
        largura += ctx.measureText('5555').width;
        var lp = largura + 76 * u, xp = (W - lp) / 2;
        var yp = quadrado ? H * 0.80 - altP / 2 : H - recuo - anel - altP - 30 * u;
        ctx.fillStyle = C.acao;
        retanguloRedondo(ctx, xp, yp, lp, altP, altP / 2); ctx.fill();
        lockup(ctx, W / 2, yp + altP / 2, corpo, 2 * u, 'centro');
        ctx.textBaseline = 'alphabetic';
        frase(ctx, E.frase, W / 2, yp - 26 * u, 29 * u, 7 * u, 'centro');
      },

      quadro: function (ctx, W, H, u) {
        desenharFoto(ctx, W, H);
        var b = 26 * u, pe = 126 * u;
        ctx.fillStyle = C.azul;
        ctx.fillRect(0, 0, W, b); ctx.fillRect(0, 0, b, H);
        ctx.fillRect(W - b, 0, b, H); ctx.fillRect(0, H - pe, W, pe);
        ctx.fillStyle = C.acao;
        ctx.fillRect(b, b, W - 2 * b, 9 * u);
        ctx.textBaseline = 'alphabetic';
        lockup(ctx, 54 * u, H - pe + 82 * u, 52 * u, 2 * u, 'esquerda');
        frase(ctx, E.frase, W - 54 * u, H - pe + 78 * u, 26 * u, 6 * u, 'direita');
      },

      limpo: function (ctx, W, H, u) {
        desenharFoto(ctx, W, H);
        var alt = 102 * u, fio = 10 * u;
        ctx.fillStyle = 'rgba(0,23,135,.94)';
        ctx.fillRect(0, H - alt, W, alt);
        ctx.fillStyle = C.acao;
        ctx.fillRect(0, H - alt - fio, W, fio);
        ctx.textBaseline = 'middle';
        lockup(ctx, W / 2, H - alt / 2, 48 * u, 3 * u, 'centro');
        ctx.textBaseline = 'alphabetic';
      }
    };

    function render(alvo, W, H) {
      alvo.width = W; alvo.height = H;
      var ctx = alvo.getContext('2d');
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      ctx.fillStyle = C.azul; ctx.fillRect(0, 0, W, H);
      DESENHOS[E.estilo](ctx, W, H, W / 1080);
    }

    function desenhar() {
      var W = E.formato[2], H = E.formato[3];
      render(tela, W, H);
      var guardado = E.estilo;
      miniaturas.forEach(function (m) {
        E.estilo = m.chave;
        render(m.tela, 132, Math.round(132 * H / W));
      });
      E.estilo = guardado;
    }

    /* ---------- controles ---------- */

    function chips(alvo, itens, atual, aoTrocar) {
      var botoes = [];
      itens.forEach(function (it) {
        var b = el('button', 'chip');
        b.type = 'button';
        b.appendChild(el('span', null, it.rotulo));
        if (it.miudo) { b.appendChild(el('small', null, it.miudo)); }
        if (it.tela) { b.insertBefore(it.tela, b.firstChild); }
        b.setAttribute('aria-pressed', String(it.chave === atual));
        b.addEventListener('click', function () {
          botoes.forEach(function (x) {
            x.setAttribute('aria-pressed', String(x === b));
          });
          aoTrocar(it.chave);
        });
        alvo.appendChild(b);
        botoes.push(b);
      });
    }

    chips(achar('#mold-formatos'),
      FORMATOS.map(function (f) {
        return { chave: f[0], rotulo: f[1], miudo: f[2] + ' × ' + f[3] };
      }),
      E.formato[0],
      function (k) {
        E.formato = FORMATOS.filter(function (f) { return f[0] === k; })[0];
        desenhar();
      });

    chips(achar('#mold-estilos'),
      ESTILOS.map(function (s) {
        var t = document.createElement('canvas');
        miniaturas.push({ chave: s[0], tela: t });
        return { chave: s[0], rotulo: s[1], tela: t };
      }),
      E.estilo,
      function (k) { E.estilo = k; desenhar(); });

    var selFrase = achar('#mold-frase');
    FRASES.forEach(function (f) {
      var o = document.createElement('option');
      o.value = f[0]; o.textContent = f[1];
      selFrase.appendChild(o);
    });
    selFrase.addEventListener('change', function () { E.frase = this.value; desenhar(); });

    zoom.addEventListener('input', function () { E.zoom = this.value / 100; desenhar(); });
    girar.addEventListener('click', function () { E.giro = (E.giro + 90) % 360; desenhar(); });
    centrar.addEventListener('click', function () { E.dx = 0; E.dy = 0; desenhar(); });

    /* ---------- arrastar e pinça ---------- */

    var toques = {}, ultimo = null, pinca = null;

    tela.addEventListener('pointerdown', function (e) {
      if (!E.img) { return; }
      tela.setPointerCapture(e.pointerId);
      toques[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(toques);
      if (ids.length === 1) { ultimo = { x: e.clientX, y: e.clientY }; }
      if (ids.length === 2) {
        var a = toques[ids[0]], b = toques[ids[1]];
        pinca = { d: Math.hypot(a.x - b.x, a.y - b.y), z: E.zoom };
      }
    });

    tela.addEventListener('pointermove', function (e) {
      if (!E.img || !toques[e.pointerId]) { return; }
      toques[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(toques);
      if (ids.length >= 2 && pinca) {
        var a = toques[ids[0]], b = toques[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        E.zoom = Math.min(3.2, Math.max(1, pinca.z * (d / pinca.d)));
        zoom.value = Math.round(E.zoom * 100);
        desenhar();
        return;
      }
      if (!ultimo) { return; }
      /* O canvas é desenhado em 1080 e exibido em outra largura. Sem esta
         razão, o arrasto anda mais devagar que o dedo em tela pequena. */
      var k = tela.width / tela.getBoundingClientRect().width;
      var W = E.formato[2], H = E.formato[3];
      var s = E.img;
      var iw = s.naturalWidth || s.width, ih = s.naturalHeight || s.height;
      var vira = (E.giro % 180) !== 0;
      var lw = vira ? ih : iw, lh = vira ? iw : ih;
      var esc = Math.max(W / lw, H / lh) * E.zoom;
      var maxX = Math.max(1, (lw * esc - W) / 2), maxY = Math.max(1, (lh * esc - H) / 2);
      E.dx = Math.max(-1, Math.min(1, E.dx + (e.clientX - ultimo.x) * k / maxX));
      E.dy = Math.max(-1, Math.min(1, E.dy + (e.clientY - ultimo.y) * k / maxY));
      ultimo = { x: e.clientX, y: e.clientY };
      desenhar();
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      tela.addEventListener(ev, function (e) {
        delete toques[e.pointerId];
        if (Object.keys(toques).length < 2) { pinca = null; }
        if (Object.keys(toques).length === 0) { ultimo = null; }
      });
    });

    /* ---------- entrada e entrega ---------- */

    function abrir(arq) {
      if (!arq) { return; }
      if (!/^image\//.test(arq.type)) {
        aviso.textContent = 'Esse arquivo não é uma imagem. Escolha um JPG ou PNG.';
        return;
      }
      var url = URL.createObjectURL(arq);
      var img = new Image();
      img.onload = function () {
        E.img = img; E.zoom = 1; E.dx = 0; E.dy = 0; E.giro = 0;
        zoom.value = 100;
        [zoom, girar, centrar].forEach(function (b) { b.disabled = false; });
        baixar.disabled = false;
        aviso.textContent = 'Pronto. A imagem foi montada no seu navegador — nada foi enviado.';
        desenhar();
        URL.revokeObjectURL(url);
      };
      img.onerror = function () {
        aviso.textContent = 'Não consegui abrir essa imagem. Tente outro arquivo.';
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }

    entrada.addEventListener('change', function (e) {
      abrir(e.target.files && e.target.files[0]);
    });
    tela.addEventListener('click', function () { if (!E.img) { entrada.click(); } });
    ['dragenter', 'dragover'].forEach(function (ev) {
      tela.addEventListener(ev, function (e) { e.preventDefault(); });
    });
    tela.addEventListener('drop', function (e) {
      e.preventDefault();
      abrir(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
    });

    /* toBlob e não toDataURL: um PNG 1080×1920 em dataURL vira uma string de
       megabytes atravessando a memória sem precisar. */
    function comBlob(quando) {
      tela.toBlob(function (blob) {
        if (!blob) { return; }
        ultimoBlob = blob;
        quando(blob);
      }, 'image/png');
    }

    baixar.addEventListener('click', function () {
      comBlob(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.download = 'georgiano-5555-' + E.formato[0] + '.png';
        a.href = url;
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      });
    });

    if (navigator.canShare) {
      try {
        var teste = new File([new Blob()], 'x.png', { type: 'image/png' });
        if (navigator.canShare({ files: [teste] })) { compartilhar.hidden = false; }
      } catch (e) { /* navegador sem File construível: fica escondido */ }
    }
    compartilhar.addEventListener('click', function () {
      comBlob(function (blob) {
        var f = new File([blob], 'georgiano-5555.png', { type: 'image/png' });
        navigator.share({ files: [f], title: 'Georgiano 5555' }).catch(function () {});
      });
    });

    /* Desenha já, com a fonte que houver, e redesenha quando a Archivo chegar.
       Pendurar o primeiro desenho em fonts.ready deixa o quadro em branco por
       um intervalo variável — e o que aparece em branco parece quebrado. */
    desenhar();
    if (document.fonts && document.fonts.load) {
      document.fonts.load('800 100px Archivo')
        .then(function () { return document.fonts.ready; })
        .then(desenhar).catch(function () {});
    }
  }

  /* ---------- rodapé legal e canais ---------- */

  function rodape() {
    var alvo = achar('#legal');
    var L = D.legal;

    alvo.appendChild(el('p', null,
      'Propaganda eleitoral. ' + L.cargo + ' · ' + L.uf + ' · ' + L.partido +
      ' · Eleição de ' + L.eleicao + '.'));

    if (L.cnpjConfirmado) {
      alvo.appendChild(el('p', null, 'CNPJ de campanha: ' + L.cnpj + ' · ' + L.partido + '.'));
    } else {
      var p = el('p', 'pendente');
      p.appendChild(el('b', null, 'CNPJ pendente de conferência. '));
      p.appendChild(document.createTextNode(L.cnpjPendencia));
      alvo.appendChild(p);
    }

    alvo.appendChild(el('p', null,
      'Todo valor e todo número listado nesta página é publicado com a fonte ao lado. ' +
      'Dados de contato aqui coletados são usados apenas para comunicação da campanha, conforme a LGPD.'));

    /* canais: sem URL, botão desligado dizendo por quê */
    var lista = achar('#canais');
    D.canais.filter(function (c) { return c.id !== 'whatsapp'; }).forEach(function (c) {
      var li = el('li');
      if (c.url) {
        var a = el('a', null, c.rotulo);
        a.href = c.url; a.rel = 'noopener noreferrer'; a.target = '_blank';
        li.appendChild(a);
      } else {
        li.appendChild(el('span', 'desligado', c.rotulo));
        li.appendChild(el('span', 'porque', c.pendencia));
      }
      lista.appendChild(li);
    });

    var zap = D.canais.filter(function (c) { return c.id === 'whatsapp'; })[0];
    var botaoZap = achar('#zap');
    botaoZap.textContent = zap.rotulo;
    if (zap.url) {
      botaoZap.href = zap.url;
    } else {
      /* Sem href o <a> deixa de ser link — e deixa de ser QUALQUER coisa para
         leitor de tela: vira texto solto, e o `title` não é anunciado de forma
         confiável. O motivo tem de estar no nome acessível, não só no balão. */
      botaoZap.removeAttribute('href');
      botaoZap.classList.add('desligado');
      botaoZap.setAttribute('role', 'link');
      botaoZap.setAttribute('aria-disabled', 'true');
      botaoZap.setAttribute('aria-label', zap.rotulo + ' — indisponível: ' + zap.pendencia);
      botaoZap.title = zap.pendencia;
    }
  }

  /* ---------- painel de verificação (fica na página, some quando zerar) ---------- */

  function painel() {
    var alvo = achar('#painel');
    var travas = D.pendencias.filter(function (p) { return p.grau === 'bloqueia'; });
    var ajustes = D.pendencias.filter(function (p) { return p.grau === 'corrigir'; });

    if (!travas.length && !ajustes.length) {
      achar('#painel-sec').hidden = true;
      return;
    }

    function grupo(titulo, itens, classe) {
      if (!itens.length) { return; }
      var box = el('div', 'grupo ' + classe);
      box.appendChild(el('h4', null, titulo + ' · ' + itens.length));
      var ul = el('ul');
      itens.forEach(function (p) {
        var li = el('li');
        li.appendChild(el('b', null, p.item));
        li.appendChild(el('span', null, 'trava: ' + p.trava));
        ul.appendChild(li);
      });
      box.appendChild(ul);
      alvo.appendChild(box);
    }

    grupo('Bloqueiam publicação', travas, 'trava');
    grupo('Corrigir sem urgência', ajustes, 'ajuste');
  }

  /* ---------- ---------- */

  /* A ponte para js/assistente.js. Ele podia montar o próprio índice de
     municípios, e aí haveria dois — que discordariam no primeiro nome com
     acento estranho. Um índice só, emprestado. */
  window.GN = {
    el: el, chave: chave, fonteLinha: fonteLinha,
    get indice() { return indice; },
    buscar: function (termo) {
      var campo = document.getElementById('campo-cidade');
      if (campo) { campo.value = termo; }
      buscar(termo);
      var r = document.getElementById('resultado');
      if (r) { r.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }
  };

  barraEstado();
  fotosFixas();
  numeros();
  entregas();
  busca();
  mapa();
  mandato();
  pautas();
  moldura();
  materiais();
  canais();
  rodape();
  painel();
})();
