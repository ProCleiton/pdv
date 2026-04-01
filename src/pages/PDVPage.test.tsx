import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";
import PDVPage from "@/pages/PDVPage";
import type { TurnoCaixa, LicencaPDV } from "@/types/pdv";

const BASE = "http://localhost:9000";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => { server.resetHandlers(); localStorage.clear(); vi.clearAllMocks(); });
afterAll(() => server.close());

const turnoMock: TurnoCaixa = {
  id: 10, codigoEstabelecimento: 1, nomeEstabelecimento: "Matriz",
  codigoFuncionario: 1, nomeFuncionario: "Administrador",
  codigoLicencaPDV: 1, nomeTerminal: "Caixa 1",
  valorAbertura: 100, valorFechamento: null,
  dtAbertura: new Date().toISOString(), dtFechamento: null,
  status: "ABERTO", observacao: "",
};

const licencaMock: LicencaPDV = {
  id: 1, codigoEstabelecimento: 1, nomeEstabelecimento: "Matriz",
  nomeTerminal: "Caixa 1", chaveLicenca: "LIC1ABCDEF",
  dtAtivacao: "2024-01-01", dtExpiracao: null, ativa: "S",
  dtUltimoUso: null, dtInsercao: null, dtAtualizacao: null,
};

const usuarioMock = {
  id: 1, login: "admin.dev", nome: "Administrador", tipo: "I",
  codigoPerfil: 0, nomePerfil: "", codigoEstabelecimento: 1, codigoFuncionario: 1,
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSangria = vi.fn();
  const onFechamento = vi.fn();
  const onConfig = vi.fn();
  render(
    <QueryClientProvider client={qc}>
      <PDVPage
        turno={turnoMock}
        usuario={usuarioMock}
        licenca={licencaMock}
        onSangria={onSangria}
        onFechamento={onFechamento}
        onConfig={onConfig}
      />
    </QueryClientProvider>
  );
  return { onSangria, onFechamento, onConfig };
}

/** Helper: adiciona produto ao carrinho e aguarda aparecer. */
async function adicionarProduto(codigo = "789001") {
  const input = screen.getByPlaceholderText(/barras/i);
  fireEvent.change(input, { target: { value: codigo } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
  await waitFor(() => expect(screen.getByText("Produto Teste")).toBeInTheDocument());
}

/** Helper: pagar com dinheiro via modal troco. */
async function pagarComDinheiro(valorRecebido = "20,00") {
  await waitFor(() => expect(screen.getByText("Dinheiro")).toBeInTheDocument());
  fireEvent.click(screen.getByText("Dinheiro"));
  await waitFor(() => expect(screen.getByText("Pagamento em Dinheiro")).toBeInTheDocument());
  fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: valorRecebido } });
  fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));
}

describe("PDVPage", () => {
  it("renderiza header com nome do terminal", () => {
    renderPage();
    expect(screen.getByText("Caixa 1")).toBeInTheDocument();
  });

  it("renderiza campo de busca", () => {
    renderPage();
    expect(screen.getByPlaceholderText(/barras/i)).toBeInTheDocument();
  });

  it("adiciona produto ao carrinho por codigo de barras", async () => {
    renderPage();
    await adicionarProduto();
  });

  it("exibe 'Produto nao encontrado' para codigo invalido", async () => {
    server.use(
      http.get(`${BASE}/produtos/barras/:codigo`, () =>
        HttpResponse.json({ error: "Produto nao encontrado" }, { status: 404 })
      ),
      http.get(`${BASE}/produtos`, () => HttpResponse.json([]))
    );
    renderPage();
    const input = screen.getByPlaceholderText(/barras/i);
    fireEvent.change(input, { target: { value: "NAO-EXISTE" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    await waitFor(() => expect(screen.getByText(/produto.*encontrado/i)).toBeInTheDocument());
  });

  it("exibe formas de pagamento carregadas", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dinheiro")).toBeInTheDocument());
    expect(screen.getByText("PIX")).toBeInTheDocument();
  });

  it("botao Finalizar Venda desabilitado com carrinho vazio", () => {
    renderPage();
    const btn = screen.getByRole("button", { name: /finalizar venda/i });
    expect(btn).toBeDisabled();
  });

  it("chama onSangria ao clicar em Sangria", () => {
    const { onSangria } = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Sangria" }));
    expect(onSangria).toHaveBeenCalled();
  });

  it("chama onFechamento ao clicar em Fechar Caixa", () => {
    const { onFechamento } = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Fechar Caixa" }));
    expect(onFechamento).toHaveBeenCalled();
  });

  it("modal troco abre ao clicar em Dinheiro e fecha ao confirmar", async () => {
    renderPage();
    await adicionarProduto();
    await waitFor(() => expect(screen.getByText("Dinheiro")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Dinheiro"));
    await waitFor(() => expect(screen.getByText("Pagamento em Dinheiro")).toBeInTheDocument());
    // Preencher valor recebido
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "20,00" } });
    expect(screen.getByText(/troco/i)).toBeInTheDocument();
    // Confirmar
    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    // Modal deve fechar
    await waitFor(() => expect(screen.queryByText("Pagamento em Dinheiro")).not.toBeInTheDocument());
  });

  it("modal troco exibe troco correto (R$20 recebido, R$10 valor)", async () => {
    renderPage();
    await adicionarProduto();
    await waitFor(() => expect(screen.getByText("Dinheiro")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Dinheiro"));
    await waitFor(() => expect(screen.getByText("Pagamento em Dinheiro")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "20,00" } });
    // Troco R$10,00
    await waitFor(() => expect(screen.getAllByText(/10,00/).length).toBeGreaterThan(0));
  });

  it("finaliza venda com item + pagamento dinheiro completo", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post(`${BASE}/vendas`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id: 999 }, { status: 201 });
      })
    );
    renderPage();
    await adicionarProduto();
    await pagarComDinheiro("20,00");
    // Finalizar
    const btnFinalizar = screen.getByRole("button", { name: /finalizar venda/i });
    await waitFor(() => expect(btnFinalizar).not.toBeDisabled());
    fireEvent.click(btnFinalizar);
    await waitFor(() => expect(screen.getByText(/venda finalizada/i)).toBeInTheDocument());
    expect(capturedBody).not.toBeNull();
    const body = capturedBody as { pagamentos: Array<{ codigoFormaPagamento: number; valor: number }> };
    expect(body.pagamentos).toBeDefined();
    expect(body.pagamentos[0].codigoFormaPagamento).toBeDefined();
    expect(body.pagamentos[0].valor).toBeGreaterThan(0);
  });

  it("body de venda omite campos TEF quando pagamento e direto", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post(`${BASE}/vendas`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id: 998 }, { status: 201 });
      })
    );
    renderPage();
    await adicionarProduto();
    await pagarComDinheiro("10,00");
    const btnFinalizar = screen.getByRole("button", { name: /finalizar venda/i });
    await waitFor(() => expect(btnFinalizar).not.toBeDisabled());
    fireEvent.click(btnFinalizar);
    await waitFor(() => screen.getByText(/venda finalizada/i));
    const body = capturedBody as { pagamentos: Array<Record<string, unknown>> };
    expect(body.pagamentos[0].nsu).toBeUndefined();
    expect(body.pagamentos[0].codigoAutorizacao).toBeUndefined();
    expect(body.pagamentos[0].bandeira).toBeUndefined();
  });
});



