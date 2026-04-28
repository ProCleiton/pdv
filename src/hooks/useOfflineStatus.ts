import { useState, useEffect, useCallback, useRef } from "react";

export interface StatusConectividade {
  online: boolean;
  verificando: boolean;
}

const INTERVALO_PING_MS = 15_000;
const TIMEOUT_PING_MS = 3_000;

export function useOfflineStatus(): StatusConectividade {
  const [online, setOnline] = useState(navigator.onLine);
  const [verificando, setVerificando] = useState(false);
  const onlineRef = useRef(online);

  const verificarConectividade = useCallback(async () => {
    if (!navigator.onLine) {
      if (onlineRef.current) {
        onlineRef.current = false;
        setOnline(false);
      }
      return;
    }
    setVerificando(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_PING_MS);
    try {
      await fetch(`${(await import("../services/api")).getApiBaseUrl()}/actuator/health`, { signal: controller.signal });
      if (!onlineRef.current) {
        onlineRef.current = true;
        setOnline(true);
        window.dispatchEvent(new CustomEvent("pdv:reconectado"));
      }
    } catch {
      if (onlineRef.current) {
        onlineRef.current = false;
        setOnline(false);
        window.dispatchEvent(new CustomEvent("pdv:desconectado"));
      }
    } finally {
      clearTimeout(timer);
      setVerificando(false);
    }
  }, []);

  useEffect(() => {
    verificarConectividade();

    const intervalo = setInterval(verificarConectividade, INTERVALO_PING_MS);

    const aoConectar = () => verificarConectividade();
    const aoDesconectar = () => {
      onlineRef.current = false;
      setOnline(false);
      window.dispatchEvent(new CustomEvent("pdv:desconectado"));
    };

    window.addEventListener("online", aoConectar);
    window.addEventListener("offline", aoDesconectar);

    return () => {
      clearInterval(intervalo);
      window.removeEventListener("online", aoConectar);
      window.removeEventListener("offline", aoDesconectar);
    };
  }, [verificarConectividade]);

  return { online, verificando };
}
