import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { logInfo, logError } from "@/services/logger";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { TurnoCaixa, Sangria } from "@/types/pdv";
import type { UsuarioPDV } from "@/lib/auth";
import { formataMoeda } from "@/lib/utils";

interface Props {
  turno: TurnoCaixa;
  usuario: UsuarioPDV;
  onFechado: () => void;
  onCancelar: () => void;
}

export default function FechamentoPage({ turno, usuario, onFechado, onCancelar }: Props) {
  const [valorFechamento, setValorFechamento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [fechando, setFechando] = useState(false);
  const [erro, setErro] = useState("");

  const { data: sangrias = [] } = useQuery<Sangria[]>({
    queryKey: ["sangrias", turno.id],
    queryFn: () => api.get<Sangria[]>(`/turnos-caixa/${turno.id}/sangrias`),
  });

  const totalSangrias = sangrias.reduce((acc, s) => acc + s.valor, 0);

  async function handleFechar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const valor = parseFloat(valorFechamento.replace(",", ".")) || 0;
    setFechando(true);
    try {
      await api.post<void>(`/turnos-caixa/${turno.id}/fechar`, {
        codigoFuncionario: usuario.codigoFuncionario,
        valorFechamento: valor,
        observacao: observacao.trim(),
      });
      await logInfo("Fechamento", usuario.login, "turno_fechado", `id=${turno.id}`);
      onFechado();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao fechar turno";
      setErro(msg);
      await logError("Fechamento", usuario.login, "erro_fechar_turno", msg);
    } finally {
      setFechando(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8 overflow-auto">
      <div className="w-full max-w-lg">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 space-y-6">
          <div className="text-center space-y-1">
            <div className="text-4xl">📋</div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Fechamento de Caixa</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Turno #{turno.id} • {turno.nomeTerminal}</p>
          </div>

          {/* Resumo */}
          <div className="rounded-lg border border-[var(--border)] p-4 space-y-2 bg-[var(--muted)]/30">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">Operador</span>
              <span className="font-medium text-[var(--foreground)]">{turno.nomeFuncionario}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">Abertura</span>
              <span className="text-[var(--foreground)]">{turno.dtAbertura ? new Date(turno.dtAbertura).toLocaleString("pt-BR") : "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">Valor Abertura</span>
              <span className="text-[var(--foreground)]">{formataMoeda(turno.valorAbertura)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">Total Sangrias ({sangrias.length})</span>
              <span className="text-[var(--destructive)]">{formataMoeda(totalSangrias)}</span>
            </div>
          </div>

          <form onSubmit={handleFechar} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-[var(--muted-foreground)]">Valor em Caixa (R$)</label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={valorFechamento}
                onChange={(e) => setValorFechamento(e.target.value)}
                className="text-lg text-center"
                autoFocus
              />
              <p className="text-xs text-[var(--muted-foreground)]">Informe o valor físico contado no caixa.</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-[var(--muted-foreground)]">Observação (opcional)</label>
              <Input
                type="text"
                placeholder="Observações do fechamento"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                maxLength={500}
              />
            </div>

            {erro && (
              <div className="rounded-md bg-[var(--destructive)]/10 border border-[var(--destructive)]/30 p-3 text-sm text-[var(--destructive)]">
                {erro}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={onCancelar}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" className="flex-1" disabled={fechando}>
                {fechando ? "Fechando…" : "Confirmar Fechamento"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
