import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formataMoeda } from "@/lib/utils";

interface Props {
  valorRestante: number;
  onConfirmar: (valorRecebido: number) => void;
  onCancelar: () => void;
}

const SUGESTOES_NOTAS = [10, 20, 50, 100, 200];

export default function ModalTroco({ valorRestante, onConfirmar, onCancelar }: Props) {
  const [valorRecebido, setValorRecebido] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const recebido = parseFloat(valorRecebido.replace(",", ".")) || 0;
  const troco = recebido >= valorRestante ? recebido - valorRestante : 0;
  const suficiente = recebido >= valorRestante;

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Sugestão mínima de nota: menor nota que cobre o valor restante
  const menorNota = SUGESTOES_NOTAS.find((n) => n >= valorRestante) ?? 200;

  function handleConfirmar() {
    if (!suficiente) return;
    onConfirmar(recebido);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && suficiente) handleConfirmar();
    if (e.key === "Escape") onCancelar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl p-6 space-y-5">
        {/* Cabeçalho */}
        <div className="text-center">
          <div className="text-3xl mb-1">💵</div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">Pagamento em Dinheiro</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Valor a pagar:{" "}
            <span className="font-semibold text-[var(--foreground)]">{formataMoeda(valorRestante)}</span>
          </p>
        </div>

        {/* Campo valor recebido */}
        <div className="space-y-1">
          <label className="text-sm text-[var(--muted-foreground)]">Valor recebido do cliente (R$)</label>
          <Input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={valorRecebido}
            onChange={(e) => setValorRecebido(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-xl text-center font-semibold"
          />
        </div>

        {/* Sugestões de notas */}
        <div className="space-y-1">
          <p className="text-xs text-[var(--muted-foreground)]">Sugestão de notas</p>
          <div className="flex gap-2 flex-wrap">
            {SUGESTOES_NOTAS.map((nota) => (
              <button
                key={nota}
                onClick={() => setValorRecebido(nota.toFixed(2).replace(".", ","))}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  nota === menorNota
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)]"
                }`}
              >
                R${nota}
              </button>
            ))}
          </div>
        </div>

        {/* Troco */}
        <div className={`rounded-lg p-4 text-center ${suficiente ? "bg-[var(--success)]/10" : "bg-[var(--destructive)]/10"}`}>
          {suficiente ? (
            <>
              <p className="text-sm text-[var(--muted-foreground)]">Troco</p>
              <p className="text-3xl font-bold text-[var(--success)]">{formataMoeda(troco)}</p>
            </>
          ) : (
            <p className="text-sm text-[var(--destructive)]">
              {recebido > 0
                ? `Valor insuficiente — falta ${formataMoeda(valorRestante - recebido)}`
                : "Informe o valor recebido"}
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancelar}>
            Cancelar (Esc)
          </Button>
          <Button className="flex-1" disabled={!suficiente} onClick={handleConfirmar}>
            Confirmar (Enter)
          </Button>
        </div>
      </div>
    </div>
  );
}
