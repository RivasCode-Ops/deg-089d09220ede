/* Georgiano 5555 — a agenda pública.
 *
 * Três perguntas, nesta ordem, e o módulo só existe para elas:
 *   1. "Ele vem pra minha cidade?"  → filtro por município, no MESMO índice da
 *      busca, e o evento aparece no topo do resultado quando alguém procura
 *      aquela cidade. Agenda não é seção isolada: é parte do eixo "sua cidade".
 *   2. "O que tem essa semana?"     → lista por data, próximo em destaque.
 *   3. "Como eu fico sabendo?"      → calendário, grupo e compartilhar, os três
 *      sem servidor. Nada de campo de e-mail ou telefone: não há onde receber,
 *      e coletar dado de eleitor abre uma frente de LGPD que a campanha não
 *      precisa. O grupo já é o canal — a agenda alimenta o grupo.
 *
 * AGENDA DESATUALIZADA É PIOR QUE AGENDA INEXISTENTE. Três travas:
 *   · o item vira `realizado` sozinho no fim do dia dele, por data;
 *   · sem nada futuro, a seção DIZ que não há compromisso confirmado;
 *   · se o gabinete não mexe no arquivo há mais dias que o limite, a página
 *     declara a data da última atualização — e o painel acusa.
 *
 * DEFESA: este arquivo nunca derruba a página. Quem edita dados/agenda.js toda
 * semana não é quem escreveu o site, e uma vírgula a mais não pode matar o
 * resto. Sem AGENDA, a seção diz que não carregou e a página segue.
 *
 * Riva's Alexandre · 02/09/2026
 */
(function () {
  'use strict';

  var D = window.CAMPANHA;
  var GN = window.GN;
  if (!D || !GN) { return; }

  var el = GN.el;
  var chave = GN.chave;

  var A = window.AGENDA;
  var cidadeFiltro = null;

  /* ---------- data ----------
     NUNCA `new Date('2026-09-12')`: a string com traços é lida como UTC e no
     Piauí (UTC−3) volta um dia. Montada por partes, é local. */

  function dataDe(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) { return null; }
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d.getTime()) ? null : d;
  }

  function hoje() {
    var h = new Date();
    return new Date(h.getFullYear(), h.getMonth(), h.getDate());
  }

  function diasAte(iso) {
    var d = dataDe(iso);
    if (!d) { return null; }
    return Math.round((d - hoje()) / 86400000);
  }

  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
               'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  function porExtenso(iso) {
    var d = dataDe(iso);
    if (!d) { return iso; }
    return SEMANA[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()];
  }

  /* ---------- estado ----------
     O estado escrito no dado vale, com uma exceção: o que já passou é
     `realizado`, tenha o gabinete editado ou não. É o que tira o passado do
     topo sem depender de ninguém lembrar. */

  function estadoReal(it) {
    if (it.estado === 'cancelado') { return 'cancelado'; }
    var dias = diasAte(it.data);
    if (dias !== null && dias < 0) { return 'realizado'; }
    return it.estado === 'confirmado' ? 'confirmado' : 'previsto';
  }

  function itens() {
    return (A && Array.isArray(A.itens) ? A.itens : []).slice()
      .sort(function (a, b) { return String(a.data).localeCompare(String(b.data)); });
  }

  function futuros() {
    return itens().filter(function (i) { return estadoReal(i) !== 'realizado'; });
  }

  /* ---------- ficar sabendo, sem servidor ---------- */

  function textoDoEvento(it) {
    return 'Georgiano ' + D.legal.numero + ' em ' + it.cidade + ' — ' +
      porExtenso(it.data) + (it.hora ? ', ' + it.hora : '') +
      (it.local ? ', ' + it.local : '') + '. ' + it.titulo;
  }

  /* .ics montado na hora, num Blob. Abre no iPhone e no Android, e não precisa
     de conta, de servidor nem de permissão. */
  function baixarIcs(it) {
    var d = dataDe(it.data);
    if (!d) { return; }
    var hm = (it.hora || '09:00').split(':');
    function z(n) { return (n < 10 ? '0' : '') + n; }
    function carimbo(dt) {
      return dt.getFullYear() + z(dt.getMonth() + 1) + z(dt.getDate()) +
             'T' + z(dt.getHours()) + z(dt.getMinutes()) + '00';
    }
    var ini = new Date(d.getFullYear(), d.getMonth(), d.getDate(), +hm[0], +hm[1]);
    var fim = new Date(ini.getTime() + 2 * 3600000);
    var linhas = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//georgiano5555//agenda//PT-BR',
      'BEGIN:VEVENT',
      'UID:' + it.id + '@georgiano5555',
      'DTSTAMP:' + carimbo(new Date()),
      'DTSTART:' + carimbo(ini),
      'DTEND:' + carimbo(fim),
      'SUMMARY:' + it.titulo + ' — ' + it.cidade,
      'LOCATION:' + [it.local, it.cidade].filter(Boolean).join(', '),
      'DESCRIPTION:' + textoDoEvento(it),
      'END:VEVENT', 'END:VCALENDAR'
    ];
    var blob = new Blob([linhas.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = it.id + '.ics'; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function acoes(alvo, it) {
    if (estadoReal(it) !== 'confirmado') { return; }

    var bt = el('button', 'ag-acao', 'Colocar no meu calendário');
    bt.type = 'button';
    bt.addEventListener('click', function () { baixarIcs(it); });
    alvo.appendChild(bt);

    var zap = D.canais.filter(function (c) { return c.id === 'whatsapp' && c.url; })[0];
    if (zap) {
      var a = el('a', 'ag-acao ag-acao-fraca', 'Avisar no grupo');
      a.href = 'https://wa.me/?text=' + encodeURIComponent(textoDoEvento(it));
      a.rel = 'noopener noreferrer'; a.target = '_blank';
      alvo.appendChild(a);
    }

    if (navigator.share) {
      var bs = el('button', 'ag-acao ag-acao-fraca', 'Compartilhar');
      bs.type = 'button';
      bs.addEventListener('click', function () {
        navigator.share({ text: textoDoEvento(it) }).catch(function () {});
      });
      alvo.appendChild(bs);
    }
  }

  /* ---------- desenho ---------- */

  function tira(it, destaque) {
    var est = estadoReal(it);
    var t = el('article', 'ag-tira ag-' + est + (destaque ? ' ag-proximo' : ''));

    var d = dataDe(it.data);
    var dia = el('div', 'ag-dia');
    if (d) {
      dia.appendChild(el('b', 'num', String(d.getDate())));
      dia.appendChild(el('span', null, MESES[d.getMonth()]));
    }
    t.appendChild(dia);

    var corpo = el('div', 'ag-corpo');
    corpo.appendChild(el('span', 'ag-selo ag-selo-' + est, est));
    corpo.appendChild(el('h4', null, it.titulo));

    var onde = [it.local, it.cidade].filter(Boolean).join(' · ');
    corpo.appendChild(el('p', 'ag-onde',
      porExtenso(it.data) + (it.hora ? ' · ' + it.hora : '') + (onde ? ' · ' + onde : '')));

    if (est === 'previsto') {
      /* Dizer o que falta, e não só marcar como previsto. */
      var falta = [];
      if (!it.hora) { falta.push('hora'); }
      if (!it.local) { falta.push('local'); }
      corpo.appendChild(el('p', 'ag-falta', falta.length
        ? 'Ainda sem ' + falta.join(' e ') + ' — quando fechar, entra como confirmado.'
        : 'Ainda não confirmado.'));
    }
    if (est === 'cancelado') {
      corpo.appendChild(el('p', 'ag-motivo', it.motivo || 'Cancelado.'));
    }
    if (it.observacao) { corpo.appendChild(el('p', 'ag-obs', it.observacao)); }

    if (destaque) {
      var dias = diasAte(it.data);
      corpo.appendChild(el('p', 'ag-contagem',
        dias === 0 ? 'É hoje.' : dias === 1 ? 'É amanhã.' : 'Faltam ' + dias + ' dias.'));
    }

    acoes(corpo, it);
    t.appendChild(corpo);
    return t;
  }

  /* ---------- filtro por cidade, no mesmo índice da busca ---------- */

  function chipsCidade(alvo, lista) {
    var cidades = [];
    lista.forEach(function (i) {
      if (i.cidade && cidades.indexOf(i.cidade) === -1) { cidades.push(i.cidade); }
    });
    if (cidades.length < 2) { return; }
    cidades.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });

    function pinta() {
      [].forEach.call(alvo.querySelectorAll('button'), function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.cidade === (cidadeFiltro || '')));
      });
    }
    function bt(rotulo, valor) {
      var b = el('button', 'chip', rotulo);
      b.type = 'button'; b.dataset.cidade = valor;
      b.addEventListener('click', function () {
        cidadeFiltro = valor || null;
        montarLista(); pinta();
      });
      alvo.appendChild(b);
    }
    bt('Todas', '');
    cidades.forEach(function (c) { bt(c, c); });
    pinta();
  }

  /* ---------- montagem ---------- */

  var alvoLista, alvoPassados, alvoAviso;

  function montarLista() {
    alvoLista.textContent = '';
    alvoPassados.textContent = '';

    var todos = itens();
    var fut = futuros().filter(function (i) {
      return !cidadeFiltro || i.cidade === cidadeFiltro;
    });
    var pass = todos.filter(function (i) {
      return estadoReal(i) === 'realizado' && (!cidadeFiltro || i.cidade === cidadeFiltro);
    });

    if (!fut.length) {
      var v = el('div', 'ag-vazio');
      v.appendChild(el('p', null, cidadeFiltro
        ? 'Nenhum compromisso público marcado em ' + cidadeFiltro + ' para os próximos dias.'
        : 'Nenhum compromisso público confirmado para os próximos dias.'));
      v.appendChild(el('p', 'ag-vazio-mini',
        'Quando houver, aparece aqui com dia, hora e lugar — e dá para pôr no seu calendário.'));
      alvoLista.appendChild(v);
    } else {
      fut.forEach(function (it, i) { alvoLista.appendChild(tira(it, i === 0)); });
    }

    if (pass.length) {
      var det = el('details', 'ag-passados');
      var sum = el('summary', null, 'Já aconteceu (' + pass.length + ')');
      det.appendChild(sum);
      pass.reverse().forEach(function (it) { det.appendChild(tira(it, false)); });
      alvoPassados.appendChild(det);
    }
  }

  /* Agenda parada: o gabinete não mexe no arquivo há mais dias que o limite e
     não há nada futuro. A página diz a data, em vez de deixar parecer viva. */
  function avisoParada() {
    if (!A) { return null; }
    if (futuros().length) { return null; }
    var dias = diasAte(A.atualizadoEm);
    if (dias === null) { return null; }
    var parada = -dias;
    if (parada < (A.diasAteAvisar || 10)) { return null; }
    return 'Esta agenda não é atualizada desde ' + porExtenso(A.atualizadoEm) +
           ' — ' + parada + ' dias. Enquanto estiver assim, ela não serve para se orientar.';
  }

  function montar() {
    alvoLista = document.getElementById('agenda-lista');
    if (!alvoLista) { return; }
    alvoPassados = document.getElementById('agenda-passados');
    alvoAviso = document.getElementById('agenda-aviso');

    if (!A || !Array.isArray(A.itens)) {
      /* Sem dado, a seção se declara quebrada — e a página segue inteira. */
      alvoAviso.className = 'ag-quebrada';
      alvoAviso.textContent = 'A agenda não carregou (dados/agenda.js). O resto da página não depende dela.';
      return;
    }

    var aviso = avisoParada();
    if (aviso) { alvoAviso.className = 'ag-parada'; alvoAviso.textContent = aviso; }

    chipsCidade(document.getElementById('agenda-cidades'), futuros());
    montarLista();
  }

  /* ---------- o encaixe com a busca ----------
     Quem procura "Picos" e tem evento em Picos vê o evento ANTES das entregas.
     É o que tira a agenda de seção isolada. */

  window.GN_AGENDA = {
    proximoEm: function (nomeCidade) {
      var k = chave(nomeCidade);
      return futuros().filter(function (i) { return chave(i.cidade) === k; })[0] || null;
    },
    tira: tira,
    porExtenso: porExtenso
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montar);
  } else {
    montar();
  }
}());
