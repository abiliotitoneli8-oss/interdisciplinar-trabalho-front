// Núcleo compartilhado: armazenamento, sacola, contas, cabeçalho, busca, login e avisos.
(function () {
  const PREFIX = 'israelli:';
  const mem = {};

  // ---------- Armazenamento (localStorage com fallback em memória) ----------
  const db = {
    get(k, d) {
      try {
        const v = localStorage.getItem(PREFIX + k);
        return v === null ? d : JSON.parse(v);
      } catch { return k in mem ? mem[k] : d; }
    },
    set(k, v) {
      mem[k] = v;
      try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch {}
    },
  };

  const brl = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',');
  const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const produto = (id) => window.CATALOGO.find((p) => p.id === id);
  const emit = (name) => document.dispatchEvent(new CustomEvent(name));
  // Miniatura: foto do produto quando existir, senão o ícone de copo sobre a cor do sabor.
  const FOTO_MONTE = 'assets/fotos/monte-o-seu.png';
  const fotoDe = (item) => (item.id === 'monte-o-seu' ? FOTO_MONTE : (produto(item.id) || {}).foto);
  const thumb = (item, s) => fotoDe(item)
    ? `<img class="thumb-img" src="${fotoDe(item)}" alt="">`
    : `<img src="assets/cup-soda-white.svg" width="${s}" height="${s}" alt="">`;

  async function hash(txt) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      let h = 0;
      for (const c of txt) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
      return 'h' + h;
    }
  }

  // ---------- Contas ----------
  const Auth = {
    users() { return db.get('users', []); },
    current() {
      const email = db.get('session', null);
      return email ? this.users().find((u) => u.email === email) || null : null;
    },
    async register(data) {
      const users = this.users();
      const email = data.email.trim().toLowerCase();
      if (users.some((u) => u.email === email)) throw new Error('Já existe uma conta com este e-mail.');
      const user = {
        nome: data.nome.trim(), email, telefone: data.telefone || '',
        senha: await hash(data.senha), criadoEm: Date.now(),
        endereco: data.endereco || { rua: '', numero: '', complemento: '', bairro: '', cidade: 'Tel Aviv' },
      };
      users.push(user);
      db.set('users', users);
      db.set('session', email);
      emit('auth');
      return user;
    },
    async login(email, senha) {
      const u = this.users().find((x) => x.email === email.trim().toLowerCase());
      if (!u || u.senha !== (await hash(senha))) throw new Error('E-mail ou senha incorretos.');
      db.set('session', u.email);
      emit('auth');
      return u;
    },
    logout() { db.set('session', null); emit('auth'); },
    async update(changes) {
      const users = this.users();
      const i = users.findIndex((u) => u.email === db.get('session', null));
      if (i < 0) throw new Error('Faça login novamente.');
      if (changes.novaSenha) {
        if (users[i].senha !== (await hash(changes.senhaAtual || ''))) throw new Error('A senha atual está incorreta.');
        users[i].senha = await hash(changes.novaSenha);
      }
      delete changes.novaSenha; delete changes.senhaAtual;
      users[i] = { ...users[i], ...changes };
      db.set('users', users);
      emit('auth');
      return users[i];
    },
  };

  // ---------- Sacola ----------
  const Cart = {
    items() { return db.get('cart', []).filter((i) => i.id === 'monte-o-seu' || produto(i.id)); },
    save(items) { db.set('cart', items); emit('cart'); },
    count() { return this.items().reduce((s, i) => s + i.qtd, 0); },
    subtotal() { return this.items().reduce((s, i) => s + i.preco * i.qtd, 0); },
    add(item) {
      const items = this.items();
      const key = [item.id, item.tamanho || '', item.detalhe || ''].join('|');
      const ex = items.find((i) => i.key === key);
      if (ex) ex.qtd += item.qtd || 1;
      else items.push({ ...item, key, qtd: item.qtd || 1 });
      this.save(items);
      toast(`<b>${esc(item.nome)}</b> foi para a sacola`, { label: 'Ver sacola', href: 'carrinho.html' });
    },
    addProduct(id, tamanho) {
      const p = produto(id);
      if (!p) return;
      const t = p.semTamanho ? '' : tamanho || '400 ml';
      const preco = p.preco + (t ? window.TAMANHOS[t] : 0);
      this.add({ id, nome: p.nome, tamanho: t, preco: Math.round(preco * 100) / 100, tint: p.tint });
    },
    setQtd(key, qtd) {
      let items = this.items();
      if (qtd <= 0) items = items.filter((i) => i.key !== key);
      else items.forEach((i) => { if (i.key === key) i.qtd = qtd; });
      this.save(items);
    },
    clear() { this.save([]); },
  };

  // ---------- Pedidos ----------
  const Orders = {
    all() { return db.get('orders', []); },
    mine() {
      const u = Auth.current();
      return u ? this.all().filter((o) => o.email === u.email).sort((a, b) => b.criadoEm - a.criadoEm) : [];
    },
    create(order) {
      const all = this.all();
      const o = { id: String(1000 + all.length + 1) + Math.floor(Math.random() * 10), criadoEm: Date.now(), ...order };
      all.push(o);
      db.set('orders', all);
      return o;
    },
    status(o) {
      const min = (Date.now() - o.criadoEm) / 60000;
      if (min < 2) return 0;   // Recebido
      if (min < 10) return 1;  // Preparando
      if (min < 40) return 2;  // A caminho
      return 3;                // Entregue
    },
    STATUS: ['Pedido recebido', 'Preparando', 'A caminho', 'Entregue'],
  };

  // ---------- Favoritos ----------
  const Favs = {
    key() { const u = Auth.current(); return 'favs:' + (u ? u.email : 'visitante'); },
    all() { return db.get(this.key(), []); },
    has(id) { return this.all().includes(id); },
    toggle(id) {
      const f = this.all();
      const on = !f.includes(id);
      db.set(this.key(), on ? [...f, id] : f.filter((x) => x !== id));
      emit('favs');
      return on;
    },
  };

  // ---------- Aviso (toast) ----------
  let toastTimer;
  function toast(html, action) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.innerHTML = `<img src="assets/check-white.svg" width="16" height="16" alt=""><span>${html}</span>` +
      (action ? `<a href="${action.href}">${action.label}</a>` : '');
    el.classList.add('is-visivel');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visivel'), 3200);
  }

  // ---------- Tema claro/escuro ----------
  const TEMA_KEY = 'israelli:tema';
  const temaAtual = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  function setTema(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(TEMA_KEY, t); } catch {}
    renderHeader();
  }
  // Se a pessoa nunca escolheu, acompanha o tema do sistema em tempo real.
  try {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      let salvo = null;
      try { salvo = localStorage.getItem(TEMA_KEY); } catch {}
      if (!salvo) { document.documentElement.dataset.theme = e.matches ? 'dark' : 'light'; renderHeader(); }
    });
  } catch {}

  // ---------- Cabeçalho ----------
  function renderHeader() {
    const el = document.querySelector('[data-header]');
    if (!el) return;
    const u = Auth.current();
    const primeiro = u ? u.nome.split(' ')[0] : '';
    el.innerHTML = `
      <a class="marca" href="index.html">ISRAELLI</a>
      <button class="local" type="button" data-local aria-label="Local de entrega">
        <img src="assets/map-pin.svg" width="21" height="21" alt="">
        <span class="local__endereco">
          <span class="local__legenda">ENTREGAR EM</span>
          <span class="local__nome">${u && u.endereco && u.endereco.bairro ? esc(u.endereco.bairro) + ' , ' + esc(u.endereco.cidade || 'Tel Aviv') : 'Tel Aviv , Israel'}</span>
        </span>
        <img src="assets/chevron-down.svg" width="15" height="15" alt="">
      </button>
      <nav class="nav__links">
        <a href="index.html#cardapio">Cardápio</a>
        <a href="index.html#monte">Monte o seu</a>
        <a href="index.html#combos">Combos</a>
      </nav>
      <div class="nav__acoes">
        <button class="icone-btn tema-btn" type="button" data-tema aria-label="${temaAtual() === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}" title="${temaAtual() === 'dark' ? 'Modo claro' : 'Modo escuro'}">
          <img src="assets/${temaAtual() === 'dark' ? 'sun' : 'moon'}-brown.svg" width="18" height="18" alt="">
        </button>
        <button class="icone-btn" type="button" data-open-search aria-label="Buscar sabores (atalho: /)">
          <img src="assets/search-brown.svg" width="18" height="18" alt="">
        </button>
        ${u ? `
        <div class="conta">
          <button class="conta__btn" type="button" data-conta aria-expanded="false">
            <span class="conta__avatar">${esc(primeiro[0] || '?').toUpperCase()}</span>
            <span>Olá, ${esc(primeiro)}</span>
            <img src="assets/chevron-down.svg" width="15" height="15" alt="">
          </button>
          <div class="conta__menu" hidden>
            <a href="perfil.html"><img src="assets/user-brown.svg" width="16" height="16" alt="">Meu perfil</a>
            <a href="pedidos.html"><img src="assets/package-brown.svg" width="16" height="16" alt="">Meus pedidos</a>
            <button type="button" data-logout><img src="assets/log-out-brown.svg" width="16" height="16" alt="">Sair</button>
          </div>
        </div>` : `
        <button class="btn btn--entrar" type="button" data-open-login>
          <img src="assets/user-brown.svg" width="16" height="16" alt="">Entrar
        </button>`}
        <a class="btn btn--sacola" href="carrinho.html">
          <span>Sacola · <span data-bag-count>${Cart.count()}</span></span>
          <img src="assets/shopping-bag.svg" width="18" height="18" alt="">
        </a>
      </div>`;
  }

  function renderFooter() {
    const el = document.querySelector('[data-footer]');
    if (!el) return;
    el.innerHTML = `
      <div class="rodape__grade">
        <div class="identidade">
          <p class="identidade__marca">ISRAELLI</p>
          <p class="identidade__proposito">Milkshakes cremosos de verdade, feitos na hora e entregues até você.</p>
          <a class="redes" href="#"><img src="assets/instagram-cream.svg" width="20" height="20" alt=""><span>@israelli.shakes</span></a>
        </div>
        <div class="grupo-links">
          <p class="grupo-links__titulo">CARDÁPIO</p>
          <a href="index.html#sabores">Mais pedidos</a>
          <a href="index.html#cardapio">Todos os sabores</a>
          <a href="index.html#monte">Monte o seu</a>
          <a href="index.html#combos">Combos</a>
        </div>
        <div class="grupo-links">
          <p class="grupo-links__titulo">MINHA CONTA</p>
          <a href="pedidos.html">Meus pedidos</a>
          <a href="carrinho.html">Minha sacola</a>
          <a href="perfil.html">Meus dados</a>
        </div>
        <div class="horarios">
          <p class="grupo-links__titulo">HORÁRIOS E PAGAMENTO</p>
          <p class="horarios__hora">Todos os dias, 12h–23h</p>
          <p class="horarios__local">Tel Aviv, Israel</p>
          <div class="pagamentos"><span>Pix</span><span>Visa</span><span>Mastercard</span></div>
        </div>
      </div>
      <div class="legal">
        <p>© 2026 Israelli. Todos os direitos reservados.</p>
        <p>Projeto conceitual de delivery de milkshake.</p>
        <p>Privacidade · Termos de uso</p>
      </div>`;
  }

  // ---------- Modal genérico ----------
  function modal(id, html) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = 'modal';
      el.hidden = true;
      el.innerHTML = `<div class="modal__fundo" data-close></div><div class="modal__caixa" role="dialog" aria-modal="true">${html}</div>`;
      document.body.appendChild(el);
      el.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(el); });
    }
    return el;
  }
  let lastFocus;
  function open(el) {
    lastFocus = document.activeElement;
    el.hidden = false;
    document.body.classList.add('sem-rolagem');
    requestAnimationFrame(() => el.classList.add('is-aberto'));
    const f = el.querySelector('input, button:not([data-close])');
    if (f) setTimeout(() => f.focus(), 30);
  }
  function close(el) {
    el.classList.remove('is-aberto');
    document.body.classList.remove('sem-rolagem');
    setTimeout(() => { el.hidden = true; }, 160);
    if (lastFocus) lastFocus.focus();
  }

  // ---------- Login (pop-up) ----------
  let afterLogin = null;
  function openLogin(next) {
    afterLogin = typeof next === 'function' ? next : null;
    const el = modal('modal-login', `
      <button class="modal__fechar" type="button" data-close aria-label="Fechar"><img src="assets/x-brown.svg" width="20" height="20" alt=""></button>
      <p class="categoria">BOM TE VER DE NOVO</p>
      <h2 class="modal__titulo">Entrar na sua conta</h2>
      <p class="modal__texto">Acompanhe seus pedidos e peça de novo em dois cliques.</p>
      <form class="form" data-login-form novalidate>
        <label class="campo"><span>E-mail</span>
          <span class="campo__input"><img src="assets/mail-brown.svg" width="16" height="16" alt=""><input type="email" name="email" autocomplete="email" placeholder="voce@email.com" required></span>
        </label>
        <label class="campo"><span>Senha</span>
          <span class="campo__input"><img src="assets/lock-brown.svg" width="16" height="16" alt=""><input type="password" name="senha" autocomplete="current-password" placeholder="Sua senha" required></span>
        </label>
        <p class="form__erro" data-erro hidden></p>
        <button class="btn btn--primario btn--largo" type="submit">Entrar</button>
      </form>
      <p class="modal__rodape">Ainda não tem conta? <a href="cadastro.html">Criar cadastro</a></p>`);
    const form = el.querySelector('[data-login-form]');
    form.reset();
    form.querySelector('[data-erro]').hidden = true;
    if (!form.dataset.ligado) {
      form.dataset.ligado = '1';
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const erro = form.querySelector('[data-erro]');
        const { email, senha } = Object.fromEntries(new FormData(form));
        if (!email || !senha) { erro.textContent = 'Preencha e-mail e senha.'; erro.hidden = false; return; }
        try {
          const u = await Auth.login(email, senha);
          close(el);
          toast(`Bem-vindo de volta, <b>${esc(u.nome.split(' ')[0])}</b>!`);
          if (afterLogin) afterLogin(u);
        } catch (err) { erro.textContent = err.message; erro.hidden = false; }
      });
    }
    open(el);
  }

  // ---------- Busca ----------
  const CATS = ['Todos', 'Clássicos', 'Com pedaços', 'Combos'];
  let catAtiva = 'Todos';
  function openSearch(termo = '') {
    const el = modal('modal-busca', `
      <div class="busca__barra">
        <img src="assets/search-teal.svg" width="22" height="22" alt="">
        <input type="search" data-busca-input placeholder="Busque por sabor, ingrediente ou combo…" aria-label="Buscar" autocomplete="off">
        <button class="modal__fechar modal__fechar--busca" type="button" data-close aria-label="Fechar"><img src="assets/x-brown.svg" width="20" height="20" alt=""></button>
      </div>
      <div class="busca__filtros">${CATS.map((c) => `<button type="button" class="opcao" data-cat="${c}">${c}</button>`).join('')}</div>
      <div class="busca__resultados" data-busca-resultados></div>`);
    el.querySelector('.modal__caixa').classList.add('modal__caixa--busca');
    const input = el.querySelector('[data-busca-input]');
    const out = el.querySelector('[data-busca-resultados]');
    const render = () => {
      el.querySelectorAll('[data-cat]').forEach((b) => b.classList.toggle('is-ativa', b.dataset.cat === catAtiva));
      const q = norm(input.value.trim());
      const res = window.CATALOGO.filter((p) =>
        (catAtiva === 'Todos' || p.categoria === catAtiva) &&
        (!q || norm(p.nome + ' ' + p.ingredientes + ' ' + p.categoria).includes(q)));
      out.innerHTML = res.length
        ? `<p class="busca__contagem">${res.length} ${res.length === 1 ? 'resultado' : 'resultados'}</p>` + res.map((p) => `
          <div class="resultado">
            <span class="resultado__cor" style="background:${p.tint}">${thumb(p, 22)}</span>
            <div class="resultado__info">
              <p class="resultado__nome">${esc(p.nome)} <span>${p.categoria}</span></p>
              <p class="resultado__desc">${esc(p.ingredientes)}</p>
            </div>
            <span class="resultado__preco">${brl(p.preco)}</span>
            <button class="add" type="button" data-busca-add="${p.id}" aria-label="Adicionar ${esc(p.nome)} à sacola"><img src="assets/plus-white.svg" width="18" height="18" alt=""></button>
          </div>`).join('')
        : `<div class="vazio vazio--busca"><p class="vazio__titulo">Nenhum shake encontrado</p><p>Tente outro sabor, como “morango” ou “chocolate”.</p></div>`;
    };
    if (!el.dataset.ligado) {
      el.dataset.ligado = '1';
      input.addEventListener('input', render);
      el.addEventListener('click', (e) => {
        const c = e.target.closest('[data-cat]');
        if (c) { catAtiva = c.dataset.cat; render(); input.focus(); }
        const a = e.target.closest('[data-busca-add]');
        if (a) Cart.addProduct(a.dataset.buscaAdd);
      });
    }
    input.value = termo;
    render();
    open(el);
  }

  // ---------- Ligações globais ----------
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-tema]')) {
      setTema(temaAtual() === 'dark' ? 'light' : 'dark');
      const btn = document.querySelector('[data-tema]');
      if (btn) btn.focus();
      return;
    }
    if (e.target.closest('[data-open-search]')) return openSearch();
    if (e.target.closest('[data-open-login]')) return openLogin();
    if (e.target.closest('[data-logout]')) {
      Auth.logout();
      toast('Você saiu da sua conta.');
      if (document.body.dataset.privada) setTimeout(() => (location.href = 'index.html'), 600);
      return;
    }
    const contaBtn = e.target.closest('[data-conta]');
    const menu = document.querySelector('.conta__menu');
    if (contaBtn && menu) {
      menu.hidden = !menu.hidden;
      contaBtn.setAttribute('aria-expanded', String(!menu.hidden));
    } else if (menu && !e.target.closest('.conta__menu')) menu.hidden = true;
  });

  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      openSearch();
    }
    if (e.key === 'Escape') document.querySelectorAll('.modal.is-aberto').forEach(close);
  });

  document.addEventListener('cart', () =>
    document.querySelectorAll('[data-bag-count]').forEach((el) => (el.textContent = Cart.count())));
  document.addEventListener('auth', renderHeader);

  renderHeader();
  renderFooter();

  window.App = { db, Auth, Cart, Orders, Favs, toast, brl, esc, norm, produto, thumb, openLogin, openSearch };
})();
