import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { logInfo, logError } from "@/services/logger";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { LicencaPDV, TurnoCaixa } from "@/types/pdv";
import type { UsuarioPDV } from "@/lib/auth";

interface Props {
  licenca: LicencaPDV;
  usuario: UsuarioPDV;
  onTurnoAberto: (turno: TurnoCaixa) => void;
  onTurnoExistente: (turno: TurnoCaixa) => void;
}

export default function AberturaTurnoPage({ licenca, usuario, onTurnoAberto, onTurnoExistente }: Props) {
  const [valorAbertura, setValorAbertura] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Verificar se já existe turno aberto para esta licença
  const { data: turnoAberto, isLoading: verificando } = useQuery({
    queryKey: ["turno-aberto", licenca.id],
    queryFn: () => api.get<TurnoCaixa | null>(`/turnos-caixa/aberto?codigoLicencaPDV=${licenca.id}`),
    retry: false,
  });

  useEffect(() => {
    if (turnoAberto && turnoAberto.id) {
      logInfo("AberturaTurno", usuario.login, "turno_existente_detectado", `turno=${turnoAberto.id}`);
      onTurnoExistente(turnoAberto);
    }
  }, [turnoAberto, usuario.login, onTurnoExistente]);

  async function handleAbrir(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const valor = parseFloat(valorAbertura.replace(",", ".")) || 0;
    setSalvando(true);
    try {
      const result = await api.post<{ id: number }>("/turnos-caixa/abrir", {
        codigoEstabelecimento: licenca.codigoEstabelecimento,
        codigoFuncionario: usuario.codigoFuncionario,
        codigoLicencaPDV: licenca.id,
        valorAbertura: valor,
      });
      // Buscar o turno recém-criado
      const turno = await api.get<TurnoCaixa>(`/turnos-caixa/${result.id}`);
      await logInfo("AberturaTurno", usuario.login, "turno_aberto", `id=${turno.id} valor=${valor}`);
      onTurnoAberto(turno);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao abrir turno";
      setErro(msg);
      await logError("AberturaTurno", usuario.login, "erro_abrir_turno", msg);
    } finally {
      setSalvando(false);
    }
  }

  if (verificando) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--muted-foreground)] animate-pulse">Verificando turno ativo…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 space-y-6">
          <div className="text-center space-y-1">
            <div className="text-4xl">🏪</div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Abertura de Turno</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Terminal: <span className="font-medium text-[var(--foreground)]">{licenca.nomeTerminal}</span>
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Operador: <span className="font-medium text-[var(--foreground)]">{usuario.nome}</span>
            </p>
          </div>

          <form onSubmit={handleAbrir} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-[var(--muted-foreground)]">Valor de Abertura (R$)</label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={valorAbertura}
                onChange={(e) => setValorAbertura(e.target.value)}
                className="text-lg text-center"
                autoFocus
              />
              <p className="text-xs text-[var(--muted-foreground)]">Informe o troco disponível no caixa para abertura. Pode ser 0.</p>
            </div>

            {erro && (
              <div className="rounded-md bg-[var(--destructive)]/10 border border-[var(--destructive)]/30 p-3 text-sm text-[var(--destructive)] space-y-2">
                <p>{erro}</p>
                <button
                  type="button"
                  onClick={() => setErro("")}
                  className="text-xs underline opacity-70 hover:opacity-100"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={salvando}>
              {salvando ? "Abrindo…" : "Abrir Turno"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
