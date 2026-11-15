(function () {
  const { Auth, Orders, Cart, brl, esc, norm, toast } = window.App;
  const root = document.querySelector('[data-pedidos]');
  const novo = new URLSearchParams(location.search).get('novo');
  let filtro = 'todos';
  let termo = '';

  const fmtData = (ts) => new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  function render() {
    const u = Auth.current();
    if (!u) {
      root.innerHTML = `
        <div class="painel vazio">
          <div class="vazio__icone"><img src="assets/package-teal.svg" width="36" height="36" alt=""></div>
          <p class="vazio__titulo">Entre para ver seus pedidos</p>
          <p>Seu histórico e o status de cada entrega ficam salvos na sua conta.</p>
          <button class="btn btn--primario" type="button" data-open-login>Entrar na minha conta</button>
          <p style="margin-top:14px;font-size:14px">Novo por aqui? <a class="link" href="cadastro.html">Criar cadastro</a></p>
        </div>`;
      return;
    }
    const todos = Orders.mine();
    if (!todos.length) {
      root.innerHTML = `
        <div class="painel vazio">
          <div class="vazio__icone"><img src="assets/package-teal.svg" width="36" height="36" alt=""></div>
          <p class="vazio__titulo">Você ainda não fez pedidos</p>
          <p>Seu primeiro shake tem R$ 5 OFF com o cupom OISRAELLI.</p>
          <a class="btn btn--primario" href="index.html#sabores">Fazer meu primeiro pedido <img src="assets/arrow-right.svg" width="18" height="18" alt=""></a>
        </div>`;
      return;
    }
    const q = norm(termo.trim());
    const lista = todos.filter((o) => {
      const st = Orders.status(o);
      if (filtro === 'andamento' && st === 3) return false;
      if (filtro === 'entregues' && st !== 3) return false;
      return !q || norm('#' + o.id + ' ' + o.itens.map((i) => i.nome + ' ' + (i.detalhe || '')).join(' ')).includes(q);
    });

    const focado = document.activeElement && document.activeElement.matches('[data-busca-pedidos]');
    root.innerHTML = `
      <div class="filtros-pedidos">
        <label class="campo__input"><img src="assets/search-brown.svg" width="16" height="16" alt="">
          <input type="search" data-busca-pedidos placeholder="Buscar por sabor ou número do pedido" value="${esc(termo)}" aria-label="Buscar pedidos"></label>
        ${[['todos', 'Todos'], ['andamento', 'Em andamento'], ['entregues', 'Entregues']].map(([v, l]) =>
          `<button type="button" class="opcao ${filtro === v ? 'is-ativa' : ''}" data-filtro="${v}">${l}</button>`).join('')}
      </div>
      <div class="lista-pedidos">
        ${lista.length ? lista.map((o) => {
          const st = Orders.status(o);
          return `
          <article class="painel pedido ${o.id === novo ? 'is-novo' : ''}">
            <div class="pedido__topo">
              <div>
                <p class="pedido__id">Pedido #${esc(o.id)}</p>
                <p class="pedido__data">${fmtData(o.criadoEm)}</p>
              </div>
              <span class="selo-status ${st === 3 ? 'entregue' : ''}">${Orders.STATUS[st]}</span>
            </div>
            <div class="linha-tempo">
              ${Orders.STATUS.map((s, i) => `<span class="passo ${i <= st ? 'feito' : ''} ${i === st && st < 3 ? 'atual' : ''}">${s}</span>`).join('')}
            </div>
            <div class="pedido__corpo">
              <ul class="pedido__itens">
                ${o.itens.map((i) => `<li><span><b>${i.qtd}× ${esc(i.nome)}</b><small>${[i.tamanho, i.detalhe].filter(Boolean).map(esc).join(' · ')}</small></span><span>${brl(i.preco * i.qtd)}</span></li>`).join('')}
              </ul>
              <div class="pedido__lateral">
                <span>Pagamento: <strong>${esc(o.pagamento)}</strong></span>
                <span>Entrega: <strong>${esc(o.endereco.rua)}, ${esc(o.endereco.numero)} · ${esc(o.endereco.bairro)}</strong></span>
                <span>Subtotal ${brl(o.subtotal)}${o.desconto ? ` · Cupom −${brl(o.desconto)}` : ''} · Entrega ${o.taxa ? brl(o.taxa) : 'grátis'}</span>
                <span class="pedido__total"><span>Total</span><span>${brl(o.total)}</span></span>
                <div class="pedido__acoes">
                  <button class="btn btn--card" type="button" data-repetir="${esc(o.id)}">Pedir de novo <img src="assets/plus-white.svg" width="18" height="18" alt=""></button>
                </div>
              </div>
            </div>
          </article>`;
        }).join('') : `<div class="painel vazio vazio--busca"><p class="vazio__titulo">Nenhum pedido encontrado</p><p>Tente outro termo ou filtro.</p></div>`}
      </div>`;
    if (focado) {
      const i = root.querySelector('[data-busca-pedidos]');
      i.focus();
      i.setSelectionRange(i.value.length, i.value.length);
    }
  }

  root.addEventListener('input', (e) => {
    if (e.target.matches('[data-busca-pedidos]')) { termo = e.target.value; render(); }
  });
  root.addEventListener('click', (e) => {
    const f = e.target.closest('[data-filtro]');
    if (f) { filtro = f.dataset.filtro; render(); }
    const r = e.target.closest('[data-repetir]');
    if (r) {
      const o = Orders.mine().find((x) => x.id === r.dataset.repetir);
      const disponiveis = o.itens.filter((i) => i.id === 'monte-o-seu' || window.App.produto(i.id));
      disponiveis.forEach(({ key: _k, ...item }) => Cart.add(item));
      const fora = o.itens.length - disponiveis.length;
      if (!disponiveis.length) toast('Os itens deste pedido não estão mais no cardápio.');
      else toast(`Itens do pedido #${esc(o.id)} na sacola${fora ? ` (${fora} fora do cardápio)` : ''}`, { label: 'Ver sacola', href: 'carrinho.html' });
    }
  });

  if (novo) setTimeout(() => toast(`Pedido <b>#${esc(novo)}</b> confirmado! Já estamos preparando.`), 200);
  document.addEventListener('auth', render);
  setInterval(render, 30000); // atualiza o status
  render();
})();
