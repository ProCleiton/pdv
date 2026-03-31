import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";
import AberturaTurnoPage from "@/pages/AberturaTurnoPage";
import type { LicencaPDV } from "@/types/pdv";

const BASE = "http://localhost:9000";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => { server.resetHandlers(); localStorage.clear(); vi.clearAllMocks(); });
afterAll(() => server.close());

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
  const onTurnoAberto = vi.fn();
  const onTurnoExistente = vi.fn();
  render(
    <QueryClientProvider client={qc}>
      <AberturaTurnoPage
        licenca={licencaMock}
        usuario={usuarioMock}
        onTurnoAberto={onTurnoAberto}
        onTurnoExistente={onTurnoExistente}
      />
    </QueryClientProvider>
  );
  return { onTurnoAberto, onTurnoExistente };
}

describe("AberturaTurnoPage", () => {
  it("renderiza formulário de abertura", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Abertura de Turno")).toBeInTheDocument());
    expect(screen.getByText("Caixa 1")).toBeInTheDocument();
  });

  it("abre turno com valor 0 quando campo vazio", async () => {
    const { onTurnoAberto } = renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: "Abrir Turno" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Abrir Turno" }));
    await waitFor(() => expect(onTurnoAberto).toHaveBeenCalled());
  });

  it("abre turno com valor informado", async () => {
    const { onTurnoAberto } = renderPage();
    await waitFor(() => expect(screen.getByPlaceholderText("0,00")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "100,00" } });
    fireEvent.click(screen.getByRole("button", { name: "Abrir Turno" }));
    await waitFor(() => expect(onTurnoAberto).toHaveBeenCalled());
  });

  it("exibe erro se API falhar", async () => {
    server.use(
      http.post(`${BASE}/turnos-caixa/abrir`, () =>
        HttpResponse.json({ error: "Erro ao abrir turno" }, { status: 500 })
      )
    );
    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: "Abrir Turno" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Abrir Turno" }));
    await waitFor(() => expect(screen.getByText(/erro/i)).toBeInTheDocument());
  });

  it("detecta turno já aberto e chama onTurnoExistente", async () => {
    server.use(
      http.get(`${BASE}/turnos-caixa/aberto`, () =>
        HttpResponse.json({
          id: 10, codigoEstabelecimento: 1, nomeEstabelecimento: "Matriz",
          codigoFuncionario: 1, nomeFuncionario: "Administrador",
          codigoLicencaPDV: 1, nomeTerminal: "Caixa 1",
          valorAbertura: 100, valorFechamento: null,
          dtAbertura: new Date().toISOString(), dtFechamento: null,
          status: "ABERTO", observacao: "",
        })
      )
    );
    const { onTurnoExistente } = renderPage();
    await waitFor(() => expect(onTurnoExistente).toHaveBeenCalled());
  });
});
