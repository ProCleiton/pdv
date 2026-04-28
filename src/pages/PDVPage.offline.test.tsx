/**
 * Testes PDVPage — comportamento offline.
 * Cobre: busca de produto offline, venda offline salva na fila, TEF bloqueado offline, badge UI.
 */
import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";
import PDVPage from "@/pages/PDVPage";
import type { TurnoCaixa, LicencaPDV } from "@/types/pdv";
import * as dbModule from "@/services/db";
import type { Database } from "@tauri-apps/plugin-sql";

const BASE = "http://localhost:9000";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => { server.resetHandlers(); localStorage.clear(); vi.clearAllMocks(); });
afterAll(() => server.close());

// Sempre offline nestes testes
vi.mock("@/hooks/useOfflineStatus", () => ({
  useOfflineStatus: () => ({ online: false, verificando: false }),
}));

vi.mock("@/hooks/useCache", () => ({
  useCache: () => ({ aquecerCache: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("@/hooks/useSyncQueue", () => ({
  useSyncQueue: () => ({
    sincronizarFila: vi.fn().mockResolvedValue({ pendentes: 0, sincronizadas: 0, erros: 0 }),
    contarPendentes: vi.fn().mockResolvedValue(2),
    listarPendentes: vi.fn().mockResolvedValue([
      { id: "uuid-1", dt_venda: "2024-01-01", dt_criacao: new Date().toISOString(), status: "pendente", erro: null },
    ]),
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

function makeMockDb(produtos: Array<{
  id: number; descricao: string; preco_venda: number; codigo_barras: string | null;
  unidade_medida: string | null; tipo: string | null; controla_estoque: string | null; ativo: string;
}> = []) {
  return {
    execute: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
    select: vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("produtos_cache")) return Promise.resolve(produtos);
      return Promise.resolve([]);
    }),
  } as unknown as Database;
}

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

describe("PDVPage — modo offline", () => {
  it("exibe badge 🔴 Offline", () => {
    renderPage();
    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(screen.getByText("🔴")).toBeInTheDocument();
  });

  it("exibe contador de pendentes no badge quando > 0", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument());
  });

  it("busca produto no cache SQLite quando offline", async () => {
    vi.spyOn(dbModule, "getDb").mockResolvedValue(makeMockDb([{
      id: 1, descricao: "Produto Cache", preco_venda: 15.0, codigo_barras: "111",
      unidade_medida: "UN", tipo: "P", controla_estoque: "N", ativo: "S",
    }]));

    renderPage();
    const input = screen.getByPlaceholderText(/barras/i);
    fireEvent.change(input, { target: { value: "111" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => expect(screen.getByText("Produto Cache")).toBeInTheDocument());
  });

  it("exibe erro quando produto não encontrado no cache offline", async () => {
    vi.spyOn(dbModule, "getDb").mockResolvedValue(makeMockDb([]));

    renderPage();
    const input = screen.getByPlaceholderText(/barras/i);
    fireEvent.change(input, { target: { value: "999" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() =>
      expect(screen.getByText(/produto não encontrado \(offline/i)).toBeInTheDocument()
    );
  });

  it("abre modal de pendentes ao clicar no badge", async () => {
    renderPage();
    const badgeBtn = screen.getByTitle(/offline/i);
    fireEvent.click(badgeBtn);
    await waitFor(() =>
      expect(screen.getByText(/vendas offline pendentes/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/uuid-1/i)).toBeInTheDocument();
  });

  it("salva venda na fila offline ao finalizar sem conexão", async () => {
    const mockDb = makeMockDb([{
      id: 1, descricao: "Produto Offline", preco_venda: 10.0, codigo_barras: "OFF1",
      unidade_medida: "UN", tipo: "P", controla_estoque: "N", ativo: "S",
    }]);
    vi.spyOn(dbModule, "getDb").mockResolvedValue(mockDb);

    // Mock formas de pagamento
    server.use(
      http.get(`${BASE}/formas-pagamentos`, () =>
        HttpResponse.json([{ id: 1, descricao: "Dinheiro", tipo: "DINHEIRO" }])
      )
    );

    renderPage();
    const input = screen.getByPlaceholderText(/barras/i);
    fireEvent.change(input, { target: { value: "OFF1" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    await waitFor(() => expect(screen.getByText("Produto Offline")).toBeInTheDocument());

    await waitFor(() => expect(screen.getByText("Dinheiro")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Dinheiro"));
    await waitFor(() => expect(screen.getByText(/pagamento em dinheiro/i)).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "10,00" } });
    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    // Aguardar modal fechar
    await waitFor(() => expect(screen.queryByText(/pagamento em dinheiro/i)).not.toBeInTheDocument());

    // Clicar em Finalizar
    const finBtn = screen.getByRole("button", { name: /finalizar venda/i });
    fireEvent.click(finBtn);

    await waitFor(() =>
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("venda_offline_queue"),
        expect.any(Array)
      )
    );
  });

  it("botão Finalizar desabilitado quando sem pagamento suficiente (offline)", async () => {
    vi.spyOn(dbModule, "getDb").mockResolvedValue(makeMockDb([{
      id: 1, descricao: "Produto TEF", preco_venda: 50.0, codigo_barras: "TEF1",
      unidade_medida: "UN", tipo: "P", controla_estoque: "N", ativo: "S",
    }]));

    renderPage();
    const input = screen.getByPlaceholderText(/barras/i);
    fireEvent.change(input, { target: { value: "TEF1" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    await waitFor(() => expect(screen.getByText("Produto TEF")).toBeInTheDocument());

    // Botão fica desabilitado pois restante > 0 (sem pagamento)
    const finBtn = screen.getByRole("button", { name: /finalizar venda/i });
    expect(finBtn).toBeDisabled();
  });
});
