// Página inicial: liga os botões do design à sacola, favoritos, tamanhos e ao "Monte o seu".
(function () {
  const { Cart, Favs, brl } = window.App;
  let tamanhoAtual = '400 ml';

  // Adicionar produtos do catálogo
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (!add) return;
    Cart.addProduct(add.dataset.add, add.hasAttribute('data-com-tamanho') ? tamanhoAtual : '400 ml');
    add.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 180 });
  });

  // Favoritos
  const pintarFavs = () =>
    document.querySelectorAll('[data-fav]').forEach((b) => {
      const on = Favs.has(b.dataset.fav);
      b.classList.toggle('is-ativo', on);
      b.textContent = on ? '♥' : '♡';
      b.setAttribute('aria-pressed', on);
    });
  document.querySelectorAll('[data-fav]').forEach((b) => b.addEventListener('click', () => Favs.toggle(b.dataset.fav)));
  document.addEventListener('favs', pintarFavs);
  document.addEventListener('auth', pintarFavs);
  pintarFavs();

  // Seletor de tamanho do cardápio
  const precosCardapio = document.querySelectorAll('.cardapio [data-preco]');
  document.querySelectorAll('.tamanho').forEach((btn) =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tamanho').forEach((b) => {
        b.classList.toggle('is-ativo', b === btn);
        b.setAttribute('aria-checked', b === btn);
      });
      tamanhoAtual = btn.textContent.trim();
      const ajuste = parseFloat(btn.dataset.tamanho);
      precosCardapio.forEach((el) => (el.textContent = brl(parseFloat(el.dataset.preco) + ajuste)));
    })
  );

  // Monte o seu
  const BASE = 19.9;
  const etapas = document.querySelectorAll('.etapa');
  const resumo = document.querySelector('[data-resumo]');
  const total = document.querySelector('[data-total]');
  let precoCriacao = BASE;
  const atualizar = () => {
    precoCriacao = BASE;
    const nomes = [];
    etapas.forEach((et) => {
      const a = et.querySelector('.opcao.is-ativa');
      if (a) { nomes.push(a.dataset.nome); precoCriacao += parseFloat(a.dataset.valor); }
    });
    resumo.textContent = nomes.join(' · ');
    total.textContent = brl(precoCriacao);
  };
  etapas.forEach((et) =>
    et.querySelectorAll('.opcao').forEach((op) =>
      op.addEventListener('click', () => {
        et.querySelectorAll('.opcao').forEach((o) => {
          o.classList.toggle('is-ativa', o === op);
          if (!o.querySelector('img')) {
            const img = document.createElement('img');
            img.src = 'assets/check-white.svg'; img.width = 13; img.height = 13; img.alt = '';
            o.prepend(img);
          }
        });
        atualizar();
      })
    )
  );
  atualizar();
  document.querySelector('[data-add-custom]').addEventListener('click', () =>
    Cart.add({ id: 'monte-o-seu', nome: 'Shake do seu jeito', detalhe: resumo.textContent, tamanho: '400 ml',
      preco: Math.round(precoCriacao * 100) / 100, tint: '#f8d7dd' }));

  // Fotos: usa a imagem de assets/fotos/ se existir; senão mantém a cor de fundo.
  document.querySelectorAll('[data-foto]').forEach((el) => {
    const img = new Image();
    img.onload = () => { el.style.backgroundImage = `url("${el.dataset.foto}")`; el.classList.add('has-foto'); };
    img.src = el.dataset.foto;
  });
})();

// Carrossel infinito da faixa "Manifesto da marca".
(function () {
  const faixa = document.querySelector('.manifesto');
  if (!faixa) return;
  const itens = [...faixa.querySelectorAll('.promessa')];
  const trilho = document.createElement('div');
  trilho.className = 'manifesto__trilho';
  const grupo = document.createElement('div');
  grupo.className = 'manifesto__grupo';
  itens.forEach((el) => grupo.appendChild(el));
  trilho.appendChild(grupo);
  faixa.appendChild(trilho);
  faixa.classList.add('manifesto--carrossel');

  // Repete as frases até o grupo ser mais largo que a tela; depois duplica o grupo
  // para o loop ficar contínuo (a animação desloca exatamente -50%).
  const larguraAlvo = Math.max(window.screen.width, window.innerWidth) + 200;
  let n = 0;
  while (grupo.scrollWidth < larguraAlvo && n < 12) {
    itens.forEach((el) => {
      const c = el.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      grupo.appendChild(c);
    });
    n++;
  }
  const copia = grupo.cloneNode(true);
  copia.setAttribute('aria-hidden', 'true');
  trilho.appendChild(copia);
  // Velocidade constante (~60px/s) independente do tamanho da tela.
  trilho.style.setProperty('--duracao', Math.round(grupo.scrollWidth / 60) + 's');
})();
