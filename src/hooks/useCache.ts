import { useCallback } from "react";
import { api } from "../services/api";
import { getDb } from "../services/db";
import type { Produto, FormaPagamento } from "../types/pdv";

/**
 * Warm cache SQLite na abertura do turno.
 * Busca produtos ativos + formas de pagamento e persiste localmente.
 * Silencioso: falhas de rede não bloqueiam a abertura do turno (cache anterior permanece).
 */
export function useCache() {
  const aquecerCache = useCallback(
    async (codigoEstabelecimento: number): Promise<void> => {
      try {
        const db = await getDb();
        const agora = new Date().toISOString();

        const [produtos, formas] = await Promise.all([
          api
            .get<Produto[]>(
              `/produtos?ativo=S&codigoEstabelecimento=${codigoEstabelecimento}&pageSize=5000`
            )
            .catch(() => null),
          api.get<FormaPagamento[]>("/formas-pagamentos").catch(() => null),
        ]);

        if (produtos) {
          await db.execute("DELETE FROM produtos_cache");
          for (const p of produtos) {
            await db.execute(
              `INSERT OR REPLACE INTO produtos_cache
                 (id, descricao, preco_venda, codigo_barras, unidade_medida, tipo, controla_estoque, ativo, dt_sync)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                p.id,
                p.descricao,
                p.precoVenda,
                p.codigoBarras ?? null,
                p.unidadeMedida ?? null,
                p.tipo ?? null,
                p.controlaEstoque ?? null,
                p.ativo ?? "S",
                agora,
              ]
            );
          }
        }

        if (formas) {
          await db.execute("DELETE FROM formas_pagamento_cache");
          for (const f of formas) {
            await db.execute(
              `INSERT OR REPLACE INTO formas_pagamento_cache (id, descricao, tipo, dt_sync)
               VALUES (?, ?, ?, ?)`,
              [f.id, f.descricao, f.tipo ?? null, agora]
            );
          }
        }
      } catch {
        // Silencioso — cache offline é melhor-esforço
      }
    },
    []
  );

  return { aquecerCache };
}
