(function () {
  const { Auth, Orders, Favs, Cart, brl, esc, toast, produto, thumb } = window.App;
  const root = document.querySelector('[data-perfil]');

  const maskTel = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  function render() {
    const u = Auth.current();
    if (!u) {
      root.innerHTML = `
        <div class="painel vazio">
          <div class="vazio__icone"><img src="assets/user-teal.svg" width="36" height="36" alt=""></div>
          <p class="vazio__titulo">Entre para ver seu perfil</p>
          <p>Seus dados, endereço e favoritos ficam guardados na sua conta.</p>
          <button class="btn btn--primario" type="button" data-open-login>Entrar na minha conta</button>
          <p style="margin-top:14px;font-size:14px">Novo por aqui? <a class="link" href="cadastro.html">Criar cadastro</a></p>
        </div>`;
      return;
    }
    const pedidos = Orders.mine();
    const gasto = pedidos.reduce((s, o) => s + o.total, 0);
    const favs = Favs.all().map(produto).filter(Boolean);
    const e = u.endereco || {};
    const desde = new Date(u.criadoEm).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    root.innerHTML = `
      <div class="perfil">
        <aside class="painel cartao-perfil">
          <div class="avatar-grande">${esc(u.nome[0] || '?').toUpperCase()}</div>
          <h2>${esc(u.nome)}</h2>
          <p>${esc(u.email)}</p>
          <p>Cliente desde ${desde}</p>
          <div class="stats">
            <div><b>${pedidos.length}</b><span>pedidos</span></div>
            <div><b>${brl(gasto).replace('R$ ', '')}</b><span>gastos (R$)</span></div>
            <div><b>${favs.length}</b><span>favoritos</span></div>
          </div>
          <a class="btn btn--primario btn--pequeno" href="pedidos.html">Ver meus pedidos</a>
          <button class="btn btn--perigo" type="button" data-logout><img src="assets/log-out-brown.svg" width="16" height="16" alt="">Sair da conta</button>
        </aside>

        <div class="secoes-perfil">
          <section class="painel secao-perfil">
            <div class="secao-perfil__cab"><p class="painel__titulo">Dados pessoais</p></div>
            <form class="form" data-form="dados" novalidate>
              <label class="campo"><span>Nome completo</span><span class="campo__input"><input name="nome" value="${esc(u.nome)}" required></span></label>
              <div class="form__grade">
                <label class="campo"><span>E-mail</span><span class="campo__input"><input value="${esc(u.email)}" readonly></span></label>
                <label class="campo"><span>Celular</span><span class="campo__input"><input name="telefone" type="tel" value="${esc(u.telefone || '')}" placeholder="(00) 00000-0000" data-mask-tel></span></label>
              </div>
              <div><button class="btn btn--card" type="submit">Salvar dados</button></div>
            </form>
          </section>

          <section class="painel secao-perfil" id="endereco">
            <div class="secao-perfil__cab"><p class="painel__titulo">Endereço de entrega</p><p>Usado para calcular o tempo de entrega</p></div>
            <form class="form" data-form="endereco" novalidate>
              <div class="form__grade form__grade--3">
                <label class="campo"><span>Rua</span><span class="campo__input"><input name="rua" value="${esc(e.rua || '')}" placeholder="Rua, avenida…" required></span></label>
                <label class="campo"><span>Número</span><span class="campo__input"><input name="numero" value="${esc(e.numero || '')}" placeholder="123" required></span></label>
                <label class="campo"><span>Complemento</span><span class="campo__input"><input name="complemento" value="${esc(e.complemento || '')}" placeholder="Apto, bloco"></span></label>
              </div>
              <div class="form__grade">
                <label class="campo"><span>Bairro</span><span class="campo__input"><input name="bairro" value="${esc(e.bairro || '')}" placeholder="Seu bairro" required></span></label>
                <label class="campo"><span>Cidade</span><span class="campo__input"><input name="cidade" value="${esc(e.cidade || 'Tel Aviv')}" required></span></label>
              </div>
              <div><button class="btn btn--card" type="submit">Salvar endereço</button></div>
            </form>
          </section>

          <section class="painel secao-perfil">
            <div class="secao-perfil__cab"><p class="painel__titulo">Meus favoritos</p><p>Toque no ♡ dos sabores para salvar aqui</p></div>
            <div class="favoritos">
              ${favs.length ? favs.map((p) => `
                <div class="resultado">
                  <span class="resultado__cor" style="background:${p.tint}">${thumb(p, 22)}</span>
                  <div class="resultado__info"><p class="resultado__nome">${esc(p.nome)}</p><p class="resultado__desc">${brl(p.preco)}</p></div>
                  <button class="add" type="button" data-fav-add="${p.id}" aria-label="Adicionar ${esc(p.nome)}"><img src="assets/plus-white.svg" width="18" height="18" alt=""></button>
                </div>`).join('') : `<div class="vazio"><p>Nenhum favorito ainda. <a class="link" href="index.html#sabores">Explorar sabores</a></p></div>`}
            </div>
          </section>

          <section class="painel secao-perfil">
            <div class="secao-perfil__cab"><p class="painel__titulo">Alterar senha</p></div>
            <form class="form" data-form="senha" novalidate>
              <div class="form__grade">
                <label class="campo"><span>Senha atual</span><span class="campo__input"><input type="password" name="senhaAtual" autocomplete="current-password" required></span></label>
                <label class="campo"><span>Nova senha</span><span class="campo__input"><input type="password" name="novaSenha" autocomplete="new-password" placeholder="Mínimo 6 caracteres" required></span></label>
              </div>
              <p class="form__erro" data-erro hidden></p>
              <div><button class="btn btn--card" type="submit">Atualizar senha</button></div>
            </form>
          </section>
        </div>
      </div>`;
  }

  root.addEventListener('input', (e) => {
    if (e.target.matches('[data-mask-tel]')) e.target.value = maskTel(e.target.value);
  });
  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-fav-add]');
    if (a) Cart.addProduct(a.dataset.favAdd);
  });
  root.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    const tipo = form.dataset.form;
    const faltando = [...form.querySelectorAll('[required]')].filter((i) => !i.value.trim());
    form.querySelectorAll('.campo').forEach((c) => c.classList.remove('campo--erro'));
    if (faltando.length) {
      faltando.forEach((i) => i.closest('.campo').classList.add('campo--erro'));
      return toast('Preencha os campos destacados.');
    }
    try {
      if (tipo === 'dados') await Auth.update({ nome: data.nome.trim(), telefone: data.telefone });
      if (tipo === 'endereco') await Auth.update({ endereco: data });
      if (tipo === 'senha') {
        if (data.novaSenha.length < 6) throw new Error('A nova senha precisa ter pelo menos 6 caracteres.');
        await Auth.update({ senhaAtual: data.senhaAtual, novaSenha: data.novaSenha });
      }
      toast(tipo === 'senha' ? 'Senha atualizada!' : 'Dados salvos!');
    } catch (err) {
      const box = form.querySelector('[data-erro]');
      if (box) { box.textContent = err.message; box.hidden = false; } else toast(err.message);
    }
  });

  document.addEventListener('auth', render);
  document.addEventListener('favs', render);
  render();
  if (location.hash === '#endereco') setTimeout(() => document.getElementById('endereco')?.scrollIntoView(), 50);
})();
