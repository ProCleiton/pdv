import { http, HttpResponse } from "msw";

const BASE = "http://localhost:9000";

export const handlers = [
  // Auth
  http.post(`${BASE}/auth/login`, () =>
    HttpResponse.json({
      token: "token-mock",
      usuario: {
        id: 1,
        login: "admin.dev",
        nome: "Administrador",
        tipo: "I",
        codigoPerfil: 0,
        nomePerfil: "",
        codigoEstabelecimento: 1,
        codigoFuncionario: 1,
      },
    })
  ),

  // Licenças PDV
  http.get(`${BASE}/licencas-pdv/validar/:chave`, ({ params }) => {
    const { chave } = params as { chave: string };
    if (chave === "CHAVE-INVALIDA") {
      return HttpResponse.json({ error: "Licença não encontrada" }, { status: 404 });
    }
    return HttpResponse.json({
      id: 1,
      codigoEstabelecimento: 1,
      nomeEstabelecimento: "Matriz",
      nomeTerminal: "Caixa 1",
      chaveLicenca: chave,
      dtAtivacao: "2024-01-01",
      dtExpiracao: null,
      ativa: "S",
      dtUltimoUso: null,
      dtInsercao: null,
      dtAtualizacao: null,
    });
  }),

  http.put(`${BASE}/licencas-pdv/:id/registrar-uso`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  http.get(`${BASE}/licencas-pdv/estabelecimento/:id`, () =>
    HttpResponse.json([
      {
        id: 1,
        codigoEstabelecimento: 1,
        nomeEstabelecimento: "Matriz",
        nomeTerminal: "Caixa 1",
        chaveLicenca: "LIC1ABCDEF",
        dtAtivacao: "2024-01-01",
        dtExpiracao: null,
        ativa: "S",
        dtUltimoUso: null,
        dtInsercao: null,
        dtAtualizacao: null,
      },
    ])
  ),

  // Turnos de caixa
  http.get(`${BASE}/turnos-caixa/aberto`, () =>
    HttpResponse.json(null, { status: 404 })
  ),

  http.post(`${BASE}/turnos-caixa/abrir`, () =>
    HttpResponse.json({ id: 10 }, { status: 201 })
  ),

  http.get(`${BASE}/turnos-caixa/10`, () =>
    HttpResponse.json({
      id: 10,
      codigoEstabelecimento: 1,
      nomeEstabelecimento: "Matriz",
      codigoFuncionario: 1,
      nomeFuncionario: "Administrador",
      codigoLicencaPDV: 1,
      nomeTerminal: "Caixa 1",
      valorAbertura: 100,
      valorFechamento: null,
      dtAbertura: new Date().toISOString(),
      dtFechamento: null,
      status: "ABERTO",
      observacao: "",
    })
  ),

  http.post(`${BASE}/turnos-caixa/:id/fechar`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  http.get(`${BASE}/turnos-caixa/:id/sangrias`, () =>
    HttpResponse.json([])
  ),

  http.post(`${BASE}/turnos-caixa/:id/sangrias`, () =>
    HttpResponse.json({ id: 5 }, { status: 201 })
  ),

  // Produtos
  http.get(`${BASE}/produtos/barras/:codigo`, ({ params }) => {
    const { codigo } = params as { codigo: string };
    if (codigo === "NAO-EXISTE") {
      return HttpResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }
    return HttpResponse.json({
      id: 1,
      descricao: "Produto Teste",
      precoCusto: 5.0,
      precoVenda: 10.0,
      codigoCategoria: 1,
      tipo: "P",
      controlaEstoque: "S",
      unidadeMedida: "UN",
      codigoBarras: codigo,
      ativo: "S",
    });
  }),

  http.get(`${BASE}/produtos`, () =>
    HttpResponse.json([
      {
        id: 2,
        descricao: "Produto Busca",
        precoCusto: 8.0,
        precoVenda: 15.0,
        codigoCategoria: 1,
        tipo: "P",
        controlaEstoque: "S",
        unidadeMedida: "UN",
        codigoBarras: "789000",
        ativo: "S",
      },
    ])
  ),

  // Formas de pagamento
  http.get(`${BASE}/formas-pagamentos`, () =>
    HttpResponse.json([
      { id: 1, descricao: "Dinheiro", tipo: "D" },
      { id: 2, descricao: "Cartão Débito", tipo: "D" },
      { id: 3, descricao: "Cartão Crédito", tipo: "C" },
      { id: 4, descricao: "PIX", tipo: "P" },
    ])
  ),

  // Vendas
  http.post(`${BASE}/vendas`, () =>
    HttpResponse.json({ id: 100 }, { status: 201 })
  ),
];
