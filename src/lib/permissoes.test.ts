import { describe, it, expect } from "vitest";
import { calcularPermissoesPDV, MODULOS_PDV_ADMIN, MODULOS_IMPLANTADOR_ONLY } from "@/lib/permissoes";

describe("calcularPermissoesPDV", () => {
  describe("Implantador (tipo I)", () => {
    it("tem acesso total em qualquer módulo", () => {
      expect(calcularPermissoesPDV("I", "config-pdv").podeVer).toBe(true);
      expect(calcularPermissoesPDV("I", "tela-pdv").podeVer).toBe(true);
      expect(calcularPermissoesPDV("I", "licenca-pdv").podeVer).toBe(true);
    });

    it("retorna todas as permissões true", () => {
      const p = calcularPermissoesPDV("I", "config-pdv");
      expect(p).toEqual({ podeVer: true, podeInserir: true, podeEditar: true, podeExcluir: true });
    });
  });

  describe("Administrador (tipo A)", () => {
    it("pode acessar config-pdv", () => {
      expect(calcularPermissoesPDV("A", "config-pdv").podeVer).toBe(true);
    });

    it("não pode acessar módulos exclusivos do Implantador", () => {
      expect(calcularPermissoesPDV("A", "licenca-pdv").podeVer).toBe(false);
    });

    it("pode acessar módulos operacionais", () => {
      expect(calcularPermissoesPDV("A", "tela-pdv").podeVer).toBe(true);
      expect(calcularPermissoesPDV("A", "sangria").podeVer).toBe(true);
      expect(calcularPermissoesPDV("A", "fechamento").podeVer).toBe(true);
    });
  });

  describe("Normal (tipo N)", () => {
    it("não pode acessar config-pdv", () => {
      const p = calcularPermissoesPDV("N", "config-pdv");
      expect(p).toEqual({ podeVer: false, podeInserir: false, podeEditar: false, podeExcluir: false });
    });

    it("não pode acessar módulos exclusivos do Implantador", () => {
      expect(calcularPermissoesPDV("N", "licenca-pdv").podeVer).toBe(false);
    });

    it("pode acessar módulos operacionais (tela-pdv, sangria, fechamento)", () => {
      expect(calcularPermissoesPDV("N", "tela-pdv").podeVer).toBe(true);
      expect(calcularPermissoesPDV("N", "sangria").podeVer).toBe(true);
      expect(calcularPermissoesPDV("N", "fechamento").podeVer).toBe(true);
    });
  });

  describe("normalização de identificadores", () => {
    it("ignora maiúsculas, hífens e espaços", () => {
      expect(calcularPermissoesPDV("N", "Config-PDV").podeVer).toBe(false);
      expect(calcularPermissoesPDV("N", "CONFIG PDV").podeVer).toBe(false);
      expect(calcularPermissoesPDV("A", "Config-PDV").podeVer).toBe(true);
    });
  });

  describe("constantes de módulos", () => {
    it("config-pdv está em MODULOS_PDV_ADMIN", () => {
      expect(MODULOS_PDV_ADMIN).toContain("config-pdv");
    });

    it("licenca-pdv está em MODULOS_IMPLANTADOR_ONLY", () => {
      expect(MODULOS_IMPLANTADOR_ONLY).toContain("licenca-pdv");
    });
  });
});
