// Catálogo da Israelli — usado pela busca, sacola e pedidos.
window.CATALOGO = [
  { id: 'morango', nome: 'Morango Chantilly', categoria: 'Clássicos', preco: 22.9, tint: '#f8d7dd', foto: 'assets/fotos/sabor-morango.png',
    ingredientes: 'Sorvete de baunilha, morangos frescos, calda de morango e chantilly.' },
  { id: 'chocolate', nome: 'Chocolate Belga', categoria: 'Clássicos', preco: 24.9, tint: '#c9a594', foto: 'assets/fotos/sabor-chocolate.png',
    ingredientes: 'Chocolate 54% cacau, calda quente, raspas de chocolate e chantilly.' },
  { id: 'cookies', nome: 'Cookies & Cream', categoria: 'Com pedaços', preco: 24.9, tint: '#dfe9ef', foto: 'assets/fotos/sabor-cookies.png',
    ingredientes: 'Sorvete de creme, biscoito recheado triturado, calda de chocolate e chantilly.' },
  { id: 'doce-de-leite', nome: 'Doce de Leite', categoria: 'Com pedaços', preco: 23.9, tint: '#e8c9a6', foto: 'assets/fotos/sabor-doce-de-leite.png',
    ingredientes: 'Doce de leite argentino, paçoca esfarelada, calda e chantilly.' },
  { id: 'combo-dupla', nome: 'Dupla Dinâmica', categoria: 'Combos', preco: 44.9, tint: '#f8d7dd', semTamanho: true, foto: 'assets/fotos/combo-dupla.png',
    ingredientes: '2 shakes de 400 ml à sua escolha + porção de cookies quentinhos.' },
  { id: 'combo-brownie', nome: 'Shake & Brownie', categoria: 'Combos', preco: 33.9, tint: '#c9a594', semTamanho: true, foto: 'assets/fotos/combo-shake-brownie.png',
    ingredientes: '1 Chocolate Belga de 400 ml + brownie da casa.' },
];

window.TAMANHOS = { '300 ml': -3, '400 ml': 0, '500 ml': 4 };
window.TAXA_ENTREGA = 4.9;
window.FRETE_GRATIS_A_PARTIR = 60;
window.PEDIDO_MINIMO = 20;
window.CUPOM = { codigo: 'OISRAELLI', desconto: 5, minimo: 30 };
