import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/mocks/server";
import { PageGuard } from "@/components/layout/PageGuard";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => { server.resetHandlers(); localStorage.clear(); vi.clearAllMocks(); });
afterAll(() => server.close());

function renderGuard(pageId: string, tipo: string, onVoltar = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  localStorage.setItem("usuario", JSON.stringify({
    id: 1, login: "test", nome: "Test", tipo,
    codigoPerfil: 0, nomePerfil: "", codigoEstabelecimento: 1, codigoFuncionario: 1,
  }));
  render(
    <QueryClientProvider client={qc}>
      <PageGuard pageId={pageId} onVoltar={onVoltar}>
        <div>Conteúdo protegido</div>
      </PageGuard>
    </QueryClientProvider>
  );
  return { onVoltar };
}

describe("PageGuard", () => {
  it("tipo I pode ver conteúdo protegido (config-pdv)", () => {
    renderGuard("config-pdv", "I");
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
    expect(screen.queryByText("Acesso negado")).not.toBeInTheDocument();
  });

  it("tipo A pode ver conteúdo protegido (config-pdv)", () => {
    renderGuard("config-pdv", "A");
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });

  it("tipo N não pode ver config-pdv — exibe acesso negado", () => {
    renderGuard("config-pdv", "N");
    expect(screen.getByText("Acesso negado")).toBeInTheDocument();
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
  });

  it("tela de acesso negado tem botão Voltar que chama onVoltar", () => {
    const { onVoltar } = renderGuard("config-pdv", "N");
    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    expect(onVoltar).toHaveBeenCalledOnce();
  });

  it("tipo N pode ver módulo operacional (tela-pdv)", () => {
    renderGuard("tela-pdv", "N");
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });

  it("sem usuário logado exibe acesso negado", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // localStorage sem usuário
    render(
      <QueryClientProvider client={qc}>
        <PageGuard pageId="config-pdv" onVoltar={vi.fn()}>
          <div>Conteúdo protegido</div>
        </PageGuard>
      </QueryClientProvider>
    );
    expect(screen.getByText("Acesso negado")).toBeInTheDocument();
  });
});
