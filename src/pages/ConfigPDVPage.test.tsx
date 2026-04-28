import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";
import ConfigPDVPage from "@/pages/ConfigPDVPage";

// Mock serial — Tauri IPC, não funciona em jsdom
vi.mock("@/services/serial", () => ({
  listarPortas: vi.fn().mockResolvedValue(["COM3", "COM5"]),
  imprimirEscPos: vi.fn().mockResolvedValue(undefined),
  abrirGaveta: vi.fn().mockResolvedValue(undefined),
}));

const BASE = "http://localhost:9000";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => { server.resetHandlers(); localStorage.clear(); vi.clearAllMocks(); });
afterAll(() => server.close());

function renderPage(onVoltar = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ConfigPDVPage onVoltar={onVoltar} />
    </QueryClientProvider>
  );
  return { onVoltar };
}

describe("ConfigPDVPage", () => {
  it("renderiza seções principais de configuração", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Configuração de Hardware")).toBeInTheDocument());
    expect(screen.getByText(/Servidor/)).toBeInTheDocument();
    expect(screen.getByText(/Impressora Térmica/)).toBeInTheDocument();
    expect(screen.getByText(/PINPAD \/ TEF/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /NFC-e/i })).toBeInTheDocument();
  });

  it("lista portas seriais detectadas pelo Tauri", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("COM3")).toBeInTheDocument();
      expect(screen.getByText("COM5")).toBeInTheDocument();
    });
  });

  it("carrega formas de pagamento para seleção TEF", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dinheiro")).toBeInTheDocument());
    expect(screen.getByText("Cartão Débito")).toBeInTheDocument();
    expect(screen.getByText("PIX")).toBeInTheDocument();
  });

  it("salva configurações em localStorage e exibe confirmação", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: /salvar configurações/i })).toBeInTheDocument());

    // Alterar URL do servidor
    const inputUrl = screen.getByPlaceholderText(/192\.168\.1\.10/);
    fireEvent.change(inputUrl, { target: { value: "http://192.168.1.100:9000" } });

    // Alterar porta impressora
    fireEvent.change(screen.getByPlaceholderText("Ex: COM3"), { target: { value: "COM3" } });

    fireEvent.click(screen.getByRole("button", { name: /salvar configurações/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /configurações salvas/i })).toBeInTheDocument()
    );

    // Verificar persistência em localStorage
    expect(localStorage.getItem("app:apiUrl")).toBe("http://192.168.1.100:9000");
    const cfgImpressora = JSON.parse(localStorage.getItem("pdv:config:impressora") ?? "{}");
    expect(cfgImpressora.portaSerial).toBe("COM3");
  });

  it("reidrata configuração salva previamente do localStorage", async () => {
    localStorage.setItem("pdv:config:impressora", JSON.stringify({
      portaSerial: "COM7", baudRate: 115200, colunas: 32, abrirGaveta: false,
    }));
    renderPage();
    await waitFor(() =>
      expect((screen.getByPlaceholderText("Ex: COM3") as HTMLInputElement).value).toBe("COM7")
    );
  });

  it("testar conexão: exibe sucesso quando servidor retorna 200", async () => {
    server.use(
      http.get(`${BASE}/actuator/health`, () =>
        HttpResponse.json({ status: "UP" }, { status: 200 })
      )
    );
    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: /testar conexão/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /testar conexão/i }));
    await waitFor(() =>
      expect(screen.getByText("✓ Servidor acessível e saudável.")).toBeInTheDocument()
    );
  });

  it("testar conexão: exibe status quando servidor retorna 503", async () => {
    server.use(
      http.get(`${BASE}/actuator/health`, () =>
        HttpResponse.json({ status: "DOWN" }, { status: 503 })
      )
    );
    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: /testar conexão/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /testar conexão/i }));
    await waitFor(() =>
      expect(screen.getByText(/servidor respondeu com status 503/i)).toBeInTheDocument()
    );
  });

  it("testar conexão: exibe erro quando rede falha", async () => {
    server.use(
      http.get(`${BASE}/actuator/health`, () => HttpResponse.error())
    );
    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: /testar conexão/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /testar conexão/i }));
    await waitFor(() =>
      expect(screen.getByText(/não foi possível conectar/i)).toBeInTheDocument()
    );
  });

  it("botão Voltar chama onVoltar", async () => {
    const { onVoltar } = renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: /← voltar/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /← voltar/i }));
    expect(onVoltar).toHaveBeenCalledOnce();
  });
});
