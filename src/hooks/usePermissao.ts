import { useMemo } from "react";
import { getUsuarioLogado } from "@/lib/auth";
import { calcularPermissoesPDV, type PermissoesModulo } from "@/lib/permissoes";

/**
 * Retorna as permissões para um módulo do PDV baseado no tipo do usuário logado.
 *
 * @param pageId  Identificador da página (ex: "config-pdv", "tela-pdv")
 */
export function usePermissao(pageId: string): PermissoesModulo {
  const usuario = getUsuarioLogado();

  return useMemo(() => {
    if (!usuario) {
      return { podeVer: false, podeInserir: false, podeEditar: false, podeExcluir: false };
    }
    return calcularPermissoesPDV(usuario.tipo, pageId);
  }, [pageId, usuario?.tipo]);
}
