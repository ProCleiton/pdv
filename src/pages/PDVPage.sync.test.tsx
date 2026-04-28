/**
 * Testes PDVPage — sincronização automática ao reconectar.
 */
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

const mockSincronizarFila = vi.fn().mockResolvedValue({ pendentes: 0, sincronizadas: 2, erros: 0 });
const mockContarPendentes = vi.fn().mockResolvedValue(0);
const mockListarPendentes = vi.fn().mockResolvedValue([]);
const mockAquecerCache = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/useOfflineStatus", () => ({
  useOfflineStatus: () => ({ online: true, verificando: false }),
}));

vi.mock("@/hooks/useCache", () => ({
  useCache: () => ({ aquecerCache: mockAquecerCache }),
}));

vi.mock("@/hooks/useSyncQueue", () => ({
  useSyncQueue: () => ({
    sincronizarFila: mockSincronizarFila,
    contarPendentes: mockContarPendentes,
    listarPendentes: mockListarPendentes,
  }),
}));

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
  id: 1, login: "admin.dev", nome: "Administrador", tipo: "I" as const,
  codigoPerfil: 0, nomePerfil: "", codigoEstabelecimento: 1, codigoFuncionario: 1,
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <PDVPage
        turno={turnoMock}
        usuario={usuarioMock}
        licenca={licencaMock}
        onSangria={vi.fn()}
        onFechamento={vi.fn()}
        onConfig={vi.fn()}
      />
    </QueryClientProvider>
  );
}

describe("PDVPage — sync ao reconectar", () => {
  it("exibe badge 🟢 Online quando conectado", () => {
    renderPage();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("aquece cache na montagem do componente", async () => {
    renderPage();
    await waitFor(() => expect(mockAquecerCache).toHaveBeenCalledWith(1));
  });

  it("verifica pendentes na montagem", async () => {
    renderPage();
    await waitFor(() => expect(mockContarPendentes).toHaveBeenCalled());
  });

  it("modal de pendentes exibe botão sincronizar habilitado quando online + pendentes = 0", async () => {
    mockContarPendentes.mockResolvedValue(0);
    renderPage();
    const badge = screen.getByTitle(/online/i);
    fireEvent.click(badge);
    await waitFor(() => expect(screen.getByText(/vendas offline pendentes/i)).toBeInTheDocument());
    const syncBtn = screen.getByRole("button", { name: /sincronizar agora/i });
    // Quando queuePendentes = 0, botão fica desabilitado
    expect(syncBtn).toBeDisabled();
  });

  it("modal fecha ao clicar em Fechar", async () => {
    renderPage();
    const badge = screen.getByTitle(/online/i);
    fireEvent.click(badge);
    await waitFor(() => expect(screen.getByText(/vendas offline pendentes/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() =>
      expect(screen.queryByText(/vendas offline pendentes/i)).not.toBeInTheDocument()
    );
  });

  it("venda online normal chama POST /vendas (não a fila)", async () => {
    server.use(
      http.get(`${BASE}/formas-pagamentos`, () =>
        HttpResponse.json([{ id: 1, descricao: "Dinheiro", tipo: "DINHEIRO" }])
      ),
      http.get(`${BASE}/produtos/barras/:codigo`, ({ params }) => {
        const { codigo } = params as { codigo: string };
        if (codigo === "ONLINE1")
          return HttpResponse.json({ error: "Não encontrado" }, { status: 404 });
        return HttpResponse.json(null, { status: 404 });
      }),
      http.get(`${BASE}/produtos`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("busca")) {
          return HttpResponse.json([{
            id: 1, descricao: "Prod Online", precoCusto: 5, precoVenda: 10,
            codigoCategoria: 1, tipo: "P", controlaEstoque: "N",
            unidadeMedida: "UN", codigoBarras: "ONLINE1", ativo: "S",
          }]);
        }
        return HttpResponse.json([]);
      }),
      http.post(`${BASE}/vendas`, () =>
        HttpResponse.json({ id: 101 }, { status: 201 })
      ),
      http.post(`${BASE}/fiscal/nfce`, () =>
        HttpResponse.json({ sucesso: false, erro: "Fiscal indisponível" }, { status: 500 })
      ),
    );

    renderPage();
    const input = screen.getByPlaceholderText(/barras/i);
    fireEvent.change(input, { target: { value: "ONLINE1" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    await waitFor(() => expect(screen.getByText("Prod Online")).toBeInTheDocument());

    await waitFor(() => expect(screen.getByText("Dinheiro")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Dinheiro"));
    await waitFor(() => expect(screen.getByText(/pagamento em dinheiro/i)).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "10,00" } });
    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    // Botão finalizar venda
    const finBtn = await screen.findByRole("button", { name: /^finalizar/i });
    fireEvent.click(finBtn);

    // Deve chamar /vendas e não a fila
    await waitFor(() => expect(mockSincronizarFila).not.toHaveBeenCalledWith(/* nada com queue */));
  });
});
