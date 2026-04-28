import { useCallback } from "react";
import { api } from "../services/api";
import { getDb } from "../services/db";

interface VendaPayload {
  codigoEstabelecimento: number;
  codigoFuncionario: number;
  codigoTurnoCaixa: number;
  itens: Array<{
    codigoProduto: number;
    quantidade: number;
    precoVenda: number;
    desconto: number;
  }>;
  pagamentos: Array<{
    codigoFormaPagamento: number;
    valor: number;
    nsu?: string;
    codigoAutorizacao?: string;
    bandeira?: string;
    tipoTransacao?: string;
  }>;
  dtVenda?: string;
  idOffline?: string;
}

interface ResultadoSync {
  idOffline: string;
  idVenda: number | null;
  status: "OK" | "ERRO";
  erro: string | null;
}

export interface EstatisticasSync {
  pendentes: number;
  sincronizadas: number;
  erros: number;
}

/**
 * Flush da fila de vendas offline.
 * Chamado automaticamente ao reconectar ou manualmente pelo operador.
 */
export function useSyncQueue() {
  const sincronizarFila = useCallback(async (): Promise<EstatisticasSync> => {
    const db = await getDb();

    type VendaRow = { id: string; payload: string };
    const pendentes = await db.select<VendaRow[]>(
      "SELECT id, payload FROM venda_offline_queue WHERE status = 'pendente' ORDER BY dt_criacao ASC"
    );

    if (pendentes.length === 0) {
      return { pendentes: 0, sincronizadas: 0, erros: 0 };
    }

    const payloads: VendaPayload[] = pendentes.map((row) => JSON.parse(row.payload));

    let resultados: ResultadoSync[] = [];
    try {
      resultados = await api.post<ResultadoSync[]>("/vendas/lote", payloads);
    } catch {
      // Rede caiu durante o sync — tenta de novo na próxima reconexão
      return { pendentes: pendentes.length, sincronizadas: 0, erros: 0 };
    }

    let sincronizadas = 0;
    let erros = 0;
    const agora = new Date().toISOString();

    for (const resultado of resultados) {
      if (resultado.status === "OK") {
        await db.execute(
          "UPDATE venda_offline_queue SET status = 'sincronizado', dt_sync = ? WHERE id = ?",
          [agora, resultado.idOffline]
        );
        sincronizadas++;
      } else {
        await db.execute(
          "UPDATE venda_offline_queue SET status = 'erro', erro = ? WHERE id = ?",
          [resultado.erro ?? "Erro desconhecido", resultado.idOffline]
        );
        erros++;
      }
    }

    return { pendentes: pendentes.length, sincronizadas, erros };
  }, []);

  const contarPendentes = useCallback(async (): Promise<number> => {
    const db = await getDb();
    type CountRow = { total: number };
    const rows = await db.select<CountRow[]>(
      "SELECT COUNT(*) as total FROM venda_offline_queue WHERE status = 'pendente'"
    );
    return rows[0]?.total ?? 0;
  }, []);

  const listarPendentes = useCallback(async () => {
    const db = await getDb();
    type VendaRow = { id: string; dt_venda: string; dt_criacao: string; status: string; erro: string | null };
    return db.select<VendaRow[]>(
      "SELECT id, dt_venda, dt_criacao, status, erro FROM venda_offline_queue ORDER BY dt_criacao DESC"
    );
  }, []);

  return { sincronizarFila, contarPendentes, listarPendentes };
}
