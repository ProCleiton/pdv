import { invoke } from "@tauri-apps/api/core";

let logFileName: string | null = null;

function getLogFileName(): string {
  if (!logFileName) {
    const now = new Date();
    const d = now.toISOString().slice(0, 10).replace(/-/g, "");
    logFileName = `pdv_${d}.log`;
  }
  return logFileName;
}

function formatLine(level: string, modulo: string, usuario: string, acao: string, detalhe?: string): string {
  const ts = new Date().toISOString();
  return `${ts} [${level}] [${modulo}] [${usuario}] ${acao}${detalhe ? " | " + detalhe : ""}`;
}

async function writeLog(level: string, modulo: string, usuario: string, acao: string, detalhe?: string) {
  try {
    const line = formatLine(level, modulo, usuario, acao, detalhe);
    await invoke("append_log_line", { filename: getLogFileName(), line });
  } catch {
    // silencioso — não interrompe o fluxo principal
  }
}

export function logInfo(modulo: string, usuario: string, acao: string, detalhe?: string) {
  return writeLog("INFO", modulo, usuario, acao, detalhe);
}

export function logError(modulo: string, usuario: string, acao: string, detalhe?: string) {
  return writeLog("ERROR", modulo, usuario, acao, detalhe);
}

export function logWarn(modulo: string, usuario: string, acao: string, detalhe?: string) {
  return writeLog("WARN", modulo, usuario, acao, detalhe);
}
