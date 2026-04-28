/**
 * Sistema de permissões do PDV ComercialIA.
 *
 * Regras:
 *  - tipo='I' (Implantador) → acesso total em tudo
 *  - tipo='A' (Administrador) → acesso total, exceto módulos exclusivos do Implantador
 *  - tipo='N' (Normal) → acesso restrito; sem acesso a módulos admin
 *
 * No PDV não há carregamento de perfil por módulo (diferente do ERP). As regras
 * são baseadas exclusivamente no tipo do usuário.
 */

/** Módulos acessíveis apenas para Implantador */
export const MODULOS_IMPLANTADOR_ONLY: readonly string[] = ["licenca-pdv"] as const;

/** Módulos acessíveis para Implantador e Administrador (não para tipo N) */
export const MODULOS_PDV_ADMIN: readonly string[] = ["config-pdv"] as const;

export interface PermissoesModulo {
  podeVer: boolean;
  podeInserir: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
}

const ACESSO_TOTAL: PermissoesModulo = { podeVer: true, podeInserir: true, podeEditar: true, podeExcluir: true };
const SEM_ACESSO: PermissoesModulo = { podeVer: false, podeInserir: false, podeEditar: false, podeExcluir: false };

function normalizar(s: string): string {
  return s.toLowerCase().replace(/[-_\s]/g, "");
}

/**
 * Calcula permissões para um módulo do PDV pelo tipo do usuário.
 * No PDV não há lookup de perfil — as regras são baseadas no tipo.
 */
export function calcularPermissoesPDV(tipo: string, pageId: string): PermissoesModulo {
  const id = normalizar(pageId);

  if (tipo === "I") return ACESSO_TOTAL;

  const isImplantadorOnly = MODULOS_IMPLANTADOR_ONLY.some((m) => normalizar(m) === id);
  if (isImplantadorOnly) return SEM_ACESSO;

  const isPdvAdmin = MODULOS_PDV_ADMIN.some((m) => normalizar(m) === id);
  if (isPdvAdmin) {
    return tipo === "A" ? ACESSO_TOTAL : SEM_ACESSO;
  }

  // Demais módulos operacionais (tela_pdv, sangria, fechamento): todos acessam
  return ACESSO_TOTAL;
}
