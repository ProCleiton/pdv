import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";
import SangriaPage from "@/pages/SangriaPage";
import type { TurnoCaixa } from "@/types/pdv";
import type { UsuarioPDV } from "@/lib/auth";

const BASE = "http://localhost:9000";

// Mock do hook — não testar integração com serial/Tauri aqui
vi.mock("@/hooks/useImpressora", () => ({
  useImpressora: () => ({
    imprimindo: false,
    erroImpressora: null,
    temImpressora: false,
    imprimirRecibo: vi.fn().mockResolvedValue(undefined),
    imprimirSangria: vi.fn().mockResolvedValue(undefined),
    abrirGavetaManual: vi.fn().mockResolvedValue(undefined),
  }),
}));

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => { server.resetHandlers(); localStorage.clear(); vi.clearAllMocks(); });
afterAll(() => server.close());

const turnoMock: TurnoCaixa = {
  id: 10,
  codigoEstabelecimento: 1,
  nomeEstabelecimento: "Matriz",
  codigoFuncionario: 1,
  nomeFuncionario: "Administrador",
  codigoLicencaPDV: 1,
  nomeTerminal: "Caixa 1",
  valorAbertura: 200,
  valorFechamento: null,
  dtAbertura: "2026-01-01T08:00:00",
  dtFechamento: null,
  status: "ABERTO",
  observacao: "",
};

const usuarioMock: UsuarioPDV = {
  id: 1, login: "admin.dev", nome: "Administrador", tipo: "I",
  codigoPerfil: 0, nomePerfil: "", codigoEstabelecimento: 1, codigoFuncionario: 1,
};

function renderPage(onVoltar = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <SangriaPage turno={turnoMock} usuario={usuarioMock} onVoltar={onVoltar} />
    </QueryClientProvider>
  );
  return { onVoltar };
}

describe("SangriaPage", () => {
  it("renderiza campos valor e motivo", () => {
    renderPage();
    expect(screen.getByText("Sangria de Caixa")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0,00")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/pagamento de fornecedor/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /registrar sangria/i })).toBeInTheDocument();
  });

  it("exibe erro quando valor está vazio", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /registrar sangria/i }));
    await waitFor(() =>
      expect(screen.getByText("Informe um valor válido maior que zero.")).toBeInTheDocument()
    );
  });

  it("exibe erro quando valor é zero", async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /registrar sangria/i }));
    await waitFor(() =>
      expect(screen.getByText("Informe um valor válido maior que zero.")).toBeInTheDocument()
    );
  });

  it("exibe erro quando motivo está vazio", async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "50,00" } });
    fireEvent.click(screen.getByRole("button", { name: /registrar sangria/i }));
    await waitFor(() =>
      expect(screen.getByText("Informe o motivo da sangria.")).toBeInTheDocument()
    );
  });

  it("registra sangria com sucesso e envia payload correto", async () => {
    let payloadCapturado: unknown;
    server.use(
      http.post(`${BASE}/turnos-caixa/:id/sangrias`, async ({ request }) => {
        payloadCapturado = await request.json();
        return HttpResponse.json({ id: 5 }, { status: 201 });
      })
    );
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "150,00" } });
    fireEvent.change(
      screen.getByPlaceholderText(/pagamento de fornecedor/i),
      { target: { value: "Fundo de troco" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /registrar sangria/i }));
    await waitFor(() =>
      expect(screen.getByText(/sangria registrada com sucesso/i)).toBeInTheDocument()
    );
    expect(payloadCapturado).toMatchObject({
      codigoFuncionario: 1,
      valor: 150,
      motivo: "Fundo de troco",
    });
  });

  it("exibe erro quando API retorna falha", async () => {
    server.use(
      http.post(`${BASE}/turnos-caixa/:id/sangrias`, () =>
        HttpResponse.json({ message: "Erro interno" }, { status: 500 })
      )
    );
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "50" } });
    fireEvent.change(
      screen.getByPlaceholderText(/pagamento de fornecedor/i),
      { target: { value: "Motivo qualquer" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /registrar sangria/i }));
    await waitFor(() => expect(screen.getByText(/erro/i)).toBeInTheDocument());
  });

  it("botão Voltar chama onVoltar", () => {
    const { onVoltar } = renderPage();
    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    expect(onVoltar).toHaveBeenCalledOnce();
  });
});
