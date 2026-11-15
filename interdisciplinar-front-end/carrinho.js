(function () {
  const { Cart, Auth, Orders, db, brl, esc, toast, openLogin, thumb } = window.App;
  const root = document.querySelector('[data-sacola]');
  let pagamento = db.get('pagamento', 'Pix');

  const calc = () => {
    const sub = Cart.subtotal();
    const u = Auth.current();
    const cupom = db.get('cupom', null);
    const primeira = !u || Orders.mine().length === 0;
    let desconto = 0, cupomMsg = '';
    if (cupom) {
      if (!primeira) cupomMsg = 'O cupom OISRAELLI vale só na primeira compra.';
      else if (sub < window.CUPOM.minimo) cupomMsg = `Falta ${brl(window.CUPOM.minimo - sub)} para usar o cupom.`;
      else desconto = window.CUPOM.desconto;
    }
    const taxa = sub >= window.FRETE_GRATIS_A_PARTIR || sub === 0 ? 0 : window.TAXA_ENTREGA;
    return { sub, desconto, taxa, total: Math.max(0, sub - desconto + taxa), cupom, cupomMsg };
  };

  function render() {
    const items = Cart.items();
    if (!items.length) {
      root.innerHTML = `
        <div class="painel vazio">
          <div class="vazio__icone"><img src="assets/shopping-bag-teal.svg" width="36" height="36" alt=""></div>
          <p class="vazio__titulo">Sua sacola está vazia</p>
          <p>Que tal começar pelo mais pedido da casa?</p>
          <a class="btn btn--primario" href="index.html#sabores">Ver sabores <img src="assets/arrow-right.svg" width="18" height="18" alt=""></a>
        </div>`;
      return;
    }
    const u = Auth.current();
    const c = calc();
    const end = u && u.endereco;
    const temEndereco = end && end.rua && end.numero;
    const faltaFrete = window.FRETE_GRATIS_A_PARTIR - c.sub;
    root.innerHTML = `
      <div class="sacola">
        <div class="painel sacola__lista">
          ${items.map((i) => `
            <div class="linha-item">
              <span class="linha-item__foto" style="background:${i.tint || '#f8d7dd'}">${thumb(i, 30)}</span>
              <div class="linha-item__info">
                <p class="linha-item__nome">${esc(i.nome)}</p>
                <p class="linha-item__meta">${[i.tamanho, i.detalhe].filter(Boolean).map(esc).join(' · ') || 'Combo'}</p>
                <p class="linha-item__unit">${brl(i.preco)} cada</p>
              </div>
              <div class="qtd">
                <button type="button" data-menos="${esc(i.key)}" aria-label="Diminuir"><img src="assets/minus-brown.svg" width="16" height="16" alt=""></button>
                <span>${i.qtd}</span>
                <button type="button" data-mais="${esc(i.key)}" aria-label="Aumentar"><img src="assets/plus-teal.svg" width="16" height="16" alt=""></button>
              </div>
              <span class="linha-item__total">${brl(i.preco * i.qtd)}</span>
              <button class="remover" type="button" data-remover="${esc(i.key)}" aria-label="Remover ${esc(i.nome)}"><img src="assets/trash-2-brown.svg" width="18" height="18" alt=""></button>
            </div>`).join('')}
        </div>

        <aside class="painel resumo-sacola">
          <p class="painel__titulo">Resumo do pedido</p>

          <div>
            <p class="bloco__rotulo">ENTREGAR EM</p>
            <div class="endereco-box">
              <img src="assets/map-pin.svg" width="20" height="20" alt="">
              <div>${u
                ? temEndereco
                  ? `<p>${esc(end.rua)}, ${esc(end.numero)}${end.complemento ? ' · ' + esc(end.complemento) : ''}</p><p>${esc(end.bairro)} · ${esc(end.cidade)} — <a class="link" href="perfil.html#endereco">alterar</a></p>`
                  : `<p>Nenhum endereço cadastrado.</p><p><a class="link" href="perfil.html#endereco">Adicionar endereço</a></p>`
                : `<p>Entre na sua conta para escolher o endereço.</p><p><button class="link" type="button" data-open-login>Entrar</button> ou <a class="link" href="cadastro.html?next=carrinho.html">criar conta</a></p>`}
              </div>
            </div>
          </div>

          <div>
            <p class="bloco__rotulo">PAGAMENTO NA ENTREGA</p>
            <div class="pagamento-opcoes">
              ${['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro'].map((p) =>
                `<button type="button" class="opcao ${p === pagamento ? 'is-ativa' : ''}" data-pagamento="${p}">${p === pagamento ? '<img src="assets/check-white.svg" width="13" height="13" alt="">' : ''}${p}</button>`).join('')}
            </div>
          </div>

          <div>
            <p class="bloco__rotulo">CUPOM</p>
            ${c.cupom
              ? `<div class="endereco-box" style="align-items:center;justify-content:space-between"><p><b>${esc(c.cupom)}</b> ${c.desconto ? '· R$ 5 OFF aplicado' : ''}</p><button class="link" type="button" data-tirar-cupom>Remover</button></div>`
              : `<form class="cupom" data-cupom><span class="campo__input"><input name="codigo" placeholder="Digite seu cupom" aria-label="Cupom"></span><button class="btn btn--secundario btn--pequeno" type="submit">Aplicar</button></form>`}
            ${c.cupomMsg ? `<p class="cupom__msg erro">${c.cupomMsg}</p>` : ''}
          </div>

          <div class="totais">
            <div><span>Subtotal</span><span>${brl(c.sub)}</span></div>
            ${c.desconto ? `<div class="desconto"><span>Cupom OISRAELLI</span><span>− ${brl(c.desconto)}</span></div>` : ''}
            <div><span>Entrega</span><span>${c.taxa ? brl(c.taxa) : 'Grátis'}</span></div>
            ${faltaFrete > 0 ? `<div style="flex-direction:column"><span style="font-size:12px">Faltam <b>${brl(faltaFrete)}</b> para entrega grátis</span><span class="barra-frete"><span style="width:${Math.min(100, (c.sub / window.FRETE_GRATIS_A_PARTIR) * 100)}%"></span></span></div>` : ''}
            <div class="total"><span>Total</span><span>${brl(c.total)}</span></div>
          </div>

          <button class="btn btn--primario btn--largo" type="button" data-finalizar ${c.sub < window.PEDIDO_MINIMO ? 'disabled' : ''}>
            Finalizar pedido <img src="assets/arrow-right.svg" width="18" height="18" alt="">
          </button>
          <p class="aviso-minimo">${c.sub < window.PEDIDO_MINIMO ? `Pedido mínimo de ${brl(window.PEDIDO_MINIMO)}. ` : ''}Entrega estimada em 30–45 min.</p>
        </aside>
      </div>`;
  }

  root.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const find = (k) => Cart.items().find((i) => i.key === k);
    if (t.dataset.mais) Cart.setQtd(t.dataset.mais, find(t.dataset.mais).qtd + 1);
    if (t.dataset.menos) Cart.setQtd(t.dataset.menos, find(t.dataset.menos).qtd - 1);
    if (t.dataset.remover) { Cart.setQtd(t.dataset.remover, 0); toast('Item removido da sacola.'); }
    if (t.dataset.pagamento) { pagamento = t.dataset.pagamento; db.set('pagamento', pagamento); render(); }
    if (t.hasAttribute('data-tirar-cupom')) { db.set('cupom', null); render(); }
    if (t.hasAttribute('data-finalizar')) finalizar();
  });

  root.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-cupom]')) return;
    e.preventDefault();
    const codigo = new FormData(e.target).get('codigo').trim().toUpperCase();
    if (codigo !== window.CUPOM.codigo) {
      e.target.insertAdjacentHTML('afterend', '<p class="cupom__msg erro">Cupom inválido.</p>');
      return;
    }
    db.set('cupom', codigo);
    render();
  });

  function finalizar() {
    const u = Auth.current();
    if (!u) return openLogin(() => { render(); finalizar(); });
    const end = u.endereco || {};
    if (!end.rua || !end.numero) {
      toast('Cadastre um endereço de entrega para continuar.', { label: 'Adicionar', href: 'perfil.html#endereco' });
      return;
    }
    const c = calc();
    const o = Orders.create({
      email: u.email, itens: Cart.items(), subtotal: c.sub, desconto: c.desconto, taxa: c.taxa, total: c.total,
      pagamento, endereco: { ...end },
    });
    db.set('cupom', null);
    Cart.clear();
    location.href = 'pedidos.html?novo=' + o.id;
  }

  document.addEventListener('cart', render);
  document.addEventListener('auth', render);
  render();
})();
