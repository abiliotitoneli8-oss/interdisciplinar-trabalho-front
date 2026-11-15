(function () {
  const { Auth, toast } = window.App;
  const form = document.querySelector('[data-cadastro]');
  const erro = form.querySelector('[data-erro]');
  const forca = form.querySelector('[data-forca]');

  // Para onde ir depois de entrar/cadastrar (ex.: cadastro.html?next=carrinho.html).
  const next = /^[\w-]+\.html$/.test(new URLSearchParams(location.search).get('next') || '')
    ? new URLSearchParams(location.search).get('next') : 'perfil.html';
  if (Auth.current()) location.replace(next);
  document.addEventListener('auth', () => { if (Auth.current()) setTimeout(() => (location.href = next), 700); });

  const maskTel = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  form.addEventListener('input', (e) => {
    if (e.target.matches('[data-mask-tel]')) e.target.value = maskTel(e.target.value);
    if (e.target.name === 'senha') {
      const s = e.target.value;
      const pts = [s.length >= 6, s.length >= 10, /\d/.test(s), /[A-Z]/.test(s) || /[^\w]/.test(s)].filter(Boolean).length;
      forca.style.width = (pts / 4) * 100 + '%';
      forca.style.background = pts <= 1 ? '#d14b4b' : pts <= 2 ? '#e8b04a' : '#34734d';
    }
    e.target.closest('.campo')?.classList.remove('campo--erro');
  });

  const fail = (msg, nomes = []) => {
    nomes.forEach((n) => form.elements[n]?.closest('.campo')?.classList.add('campo--erro'));
    erro.textContent = msg;
    erro.hidden = false;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erro.hidden = true;
    const d = Object.fromEntries(new FormData(form));
    const vazios = ['nome', 'email', 'telefone', 'senha', 'confirmar', 'rua', 'numero', 'bairro', 'cidade'].filter((n) => !String(d[n] || '').trim());
    if (vazios.length) return fail('Preencha todos os campos obrigatórios.', vazios);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return fail('Digite um e-mail válido.', ['email']);
    if (d.telefone.replace(/\D/g, '').length < 10) return fail('Digite um celular com DDD.', ['telefone']);
    if (d.senha.length < 6) return fail('A senha precisa ter pelo menos 6 caracteres.', ['senha']);
    if (d.senha !== d.confirmar) return fail('As senhas não conferem.', ['confirmar']);
    if (!d.termos) return fail('Você precisa aceitar os termos para continuar.');
    try {
      const u = await Auth.register({
        nome: d.nome, email: d.email, telefone: d.telefone, senha: d.senha,
        endereco: { rua: d.rua, numero: d.numero, complemento: d.complemento, bairro: d.bairro, cidade: d.cidade },
      });
      toast(`Conta criada! Bem-vindo, <b>${u.nome.split(' ')[0]}</b>.`);
    } catch (err) {
      fail(err.message, ['email']);
    }
  });
})();
