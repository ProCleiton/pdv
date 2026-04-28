import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";
import FechamentoPage from "@/pages/FechamentoPage";
import type { TurnoCaixa } from "@/types/pdv";
import type { UsuarioPDV } from "@/lib/auth";

const BASE = "http://localhost:9000";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => { server.resetHandlers(); localStorage.clear(); vi.clearAllMocks(); });
afterAll(() => server.close());

const turnoMock: TurnoCaixa = {
  id: 10,
  codigoEstabelecimento: 1,
  nomeEstabelecimento: "Matriz",
  codigoFuncionario: 1,
  nomeFuncionario: "José Silva",
  codigoLicencaPDV: 1,
  nomeTerminal: "Caixa 1",
  valorAbertura: 300,
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

function renderPage({ onFechado = vi.fn(), onCancelar = vi.fn() } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <FechamentoPage
        turno={turnoMock}
        usuario={usuarioMock}
        onFechado={onFechado}
        onCancelar={onCancelar}
      />
    </QueryClientProvider>
  );
  return { onFechado, onCancelar };
}

describe("FechamentoPage", () => {
  it("renderiza resumo do turno", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Fechamento de Caixa")).toBeInTheDocument());
    expect(screen.getByText("José Silva")).toBeInTheDocument();
    // valor abertura formatado
    expect(screen.getByText(/300/)).toBeInTheDocument();
  });

  it("carrega e exibe sangrias do turno", async () => {
    server.use(
      http.get(`${BASE}/turnos-caixa/:id/sangrias`, () =>
        HttpResponse.json([
          { id: 1, valor: 50, motivo: "Troco", dtSangria: "2026-01-01T09:00:00" },
          { id: 2, valor: 30, motivo: "Fornecedor", dtSangria: "2026-01-01T10:00:00" },
        ])
      )
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Total Sangrias \(2\)/i)).toBeInTheDocument()
    );
    // total = 80
    expect(screen.getByText(/80/)).toBeInTheDocument();
  });

  it("sem sangrias exibe contador zerado", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Total Sangrias \(0\)/i)).toBeInTheDocument()
    );
  });

  it("fechamento bem-sucedido chama onFechado e envia payload correto", async () => {
    let payloadCapturado: unknown;
    server.use(
      http.post(`${BASE}/turnos-caixa/:id/fechar`, async ({ request }) => {
        payloadCapturado = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );
    const { onFechado } = renderPage();
    await waitFor(() => expect(screen.getByPlaceholderText("0,00")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "280,00" } });
    fireEvent.change(
      screen.getByPlaceholderText(/observações do fechamento/i),
      { target: { value: "Fechamento normal" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /confirmar fechamento/i }));
    await waitFor(() => expect(onFechado).toHaveBeenCalledOnce());
    expect(payloadCapturado).toMatchObject({
      codigoFuncionario: 1,
      valorFechamento: 280,
      observacao: "Fechamento normal",
    });
  });

  it("fechamento com valor vazio envia valorFechamento = 0", async () => {
    let payloadCapturado: unknown;
    server.use(
      http.post(`${BASE}/turnos-caixa/:id/fechar`, async ({ request }) => {
        payloadCapturado = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );
    const { onFechado } = renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: /confirmar fechamento/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /confirmar fechamento/i }));
    await waitFor(() => expect(onFechado).toHaveBeenCalledOnce());
    expect((payloadCapturado as { valorFechamento: number }).valorFechamento).toBe(0);
  });

  it("exibe erro quando API retorna falha", async () => {
    server.use(
      http.post(`${BASE}/turnos-caixa/:id/fechar`, () =>
        HttpResponse.json({ message: "Falha ao fechar" }, { status: 500 })
      )
    );
    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: /confirmar fechamento/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /confirmar fechamento/i }));
    await waitFor(() => expect(screen.getByText(/falha ao fechar/i)).toBeInTheDocument());
  });

  it("botão Cancelar chama onCancelar", async () => {
    const { onCancelar } = renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onCancelar).toHaveBeenCalledOnce();
  });
});
