import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useOfflineStatus } from "./useOfflineStatus";

const API_URL = "http://localhost:9000";
const fetchOk = () => Promise.resolve(new Response(JSON.stringify({ status: "UP" })));

describe("useOfflineStatus", () => {
  beforeEach(() => {
    localStorage.setItem("app:apiUrl", API_URL);
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true, writable: true });
  });

  afterEach(() => vi.restoreAllMocks());

  it("online quando navigator.onLine=true e backend responde", async () => {
    global.fetch = vi.fn().mockImplementation(fetchOk);
    const { result } = renderHook(() => useOfflineStatus());
    await waitFor(() => expect(result.current.online).toBe(true));
  });

  it("offline quando fetch falha", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() => useOfflineStatus());
    await waitFor(() => expect(result.current.online).toBe(false));
  });

  it("offline sem chamar fetch quando navigator.onLine=false", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true });
    global.fetch = vi.fn().mockImplementation(fetchOk);
    const { result } = renderHook(() => useOfflineStatus());
    await waitFor(() => expect(result.current.verificando).toBe(false));
    expect(result.current.online).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("dispara pdv:desconectado ao detectar falha de rede", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("down"));
    const listener = vi.fn();
    window.addEventListener("pdv:desconectado", listener);
    const { result } = renderHook(() => useOfflineStatus());
    await waitFor(() => expect(result.current.online).toBe(false));
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener("pdv:desconectado", listener);
  });

  it("dispara pdv:reconectado ao voltar online via evento window", async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error("down"))
      .mockImplementation(fetchOk);
    const listener = vi.fn();
    window.addEventListener("pdv:reconectado", listener);

    const { result } = renderHook(() => useOfflineStatus());
    await waitFor(() => expect(result.current.online).toBe(false));

    // Evento 'online' do browser re-dispara verificarConectividade
    window.dispatchEvent(new Event("online"));
    await waitFor(() => expect(result.current.online).toBe(true));
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener("pdv:reconectado", listener);
  });

  it("faz múltiplos fetches (polling ativo)", async () => {
    // Mock setInterval para confirmar que o hook registra intervalo
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    global.fetch = vi.fn().mockImplementation(fetchOk);
    renderHook(() => useOfflineStatus());
    await waitFor(() => expect(setIntervalSpy).toHaveBeenCalled());
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 15_000);
  });
});
