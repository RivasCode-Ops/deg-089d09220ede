/* Georgiano 5555 — agenda pública de compromissos.
 *
 * POR QUE ESTE ARQUIVO É SEPARADO DO campanha.js
 * Ele é o único que muda toda semana, e quem mexe nele não é quem escreveu o
 * site. Um erro de vírgula aqui não pode derrubar a página inteira — por isso
 * js/agenda.js lê `window.AGENDA` com defesa e a seção se declara quebrada em
 * vez de matar o resto. Fica no mesmo padrão do campanha.js e mais nada.
 *
 * A REGRA DE FUNDO
 * O site inteiro é "número com fonte ao lado". Agenda é fato FUTURO e não tem
 * fonte. O equivalente honesto da fonte, no futuro, é o ESTADO:
 *
 *   confirmado — dia, hora e local fechados
 *   previsto   — cidade e semana, sem hora ou sem local; diz o que falta
 *   cancelado  — NÃO some da lista. Fica riscado, com o motivo escrito.
 *   realizado  — já aconteceu; sai do topo sozinho, por data
 *
 * Cancelado sumir é a mesma mentira do mapa branco: some do site, parece que
 * nunca existiu. Fica, e diz por quê.
 *
 * SEGURANÇA — travado, não recomendado
 *   1. Só local público. Nunca residência, nunca ponto privado.
 *   2. Evento sensível entra como `previsto` com "local divulgado no dia":
 *      cidade sim, ponto exato não.
 *   3. `endereco` só é aceito quando o estado é `confirmado`. O verificador
 *      reprova o contrário — rota de candidato publicada com antecedência é
 *      informação operacional, e a diferença entre nome do lugar e endereço
 *      com número é a diferença entre avisar e entregar o trajeto.
 *   4. Nada de mapa com pino no ponto exato. Nome do lugar basta, e por isso
 *      não existe pino nenhum neste módulo.
 *
 * ARMADILHA DE DATA, e ela já derrubou agenda de campanha antes:
 * `new Date('2026-09-12')` é lido como UTC e no Piauí (UTC−3) mostra 11/09.
 * A data é montada por partes em js/agenda.js. Nunca passe a string ao Date.
 *
 * COMO ATUALIZAR
 * Abra `agenda-editar.html` no navegador, preencha o formulário e cole o bloco
 * que ele gera aqui dentro. Ele valida antes de gerar — data no formato certo,
 * cidade que existe, motivo obrigatório no cancelado. Editar este arquivo à mão
 * também funciona; o gerador existe para não depender disso.
 */
(function (raiz) {
  'use strict';

  raiz.AGENDA = {

    /* Quando o gabinete mexeu nisto pela última vez. NÃO é a data do último
       evento: uma semana honestamente vazia deixaria o site parecer
       abandonado. Se esta data ficar velha, a página declara que a agenda não
       é atualizada desde então — e o painel de pendências acusa. */
    atualizadoEm: '2026-09-02',

    /* Quantos dias de silêncio até a página avisar que a agenda parou. */
    diasAteAvisar: 10,

    /* ------------------------------------------------------------------
     * VAZIA DE PROPÓSITO.
     *
     * Nenhum compromisso do Georgiano foi informado até agora, e agenda de
     * candidato não se inventa: um evento falso é pior que nenhum evento —
     * manda gente para um lugar onde não há ninguém.
     *
     * Enquanto estiver vazia a seção diz isso com todas as letras, em vez de
     * sumir ou mostrar coisa velha. É o mesmo tratamento do município sem
     * entrega: vazio com nome é diferente de vazio.
     *
     * Modelo de um item — copie, preencha, apague este comentário:
     *
     *   {
     *     id: 'picos-caminhada-2026-09-12',
     *     estado: 'confirmado',          // confirmado | previsto | cancelado | realizado
     *     data: '2026-09-12',            // sempre AAAA-MM-DD
     *     hora: '16:00',                 // null quando previsto
     *     cidade: 'Picos',               // tem de existir na lista de municípios
     *     local: 'Praça Félix Pacheco',  // SÓ local público
     *     endereco: null,                // só quando confirmado; nunca residência
     *     titulo: 'Caminhada no centro',
     *     tipo: 'caminhada',             // caminhada | reunião | carreata | entrega | live | debate
     *     observacao: null,
     *     motivo: null                   // OBRIGATÓRIO quando estado = cancelado
     *   }
     * ------------------------------------------------------------------ */
    itens: []
  };

}(typeof window !== 'undefined' ? window : globalThis));
