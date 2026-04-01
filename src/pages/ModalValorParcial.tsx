import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formataMoeda } from "@/lib/utils";
import type { FormaPagamento } from "@/types/pdv";

interface Props {
  forma: FormaPagamento;
  valorMaximo: number;
  onConfirmar: (valor: number) => void;
  onCancelar: () => void;
}

export default function ModalValorParcial({ forma, valorMaximo, onConfirmar, onCancelar }: Props) {
  const [valorStr, setValorStr] = useState(valorMaximo.toFixed(2).replace(".", ","));
  const inputRef = useRef<HTMLInputElement>(null);

  const valor = parseFloat(valorStr.replace(",", ".")) || 0;
  const valido = valor > 0 && valor <= valorMaximo;

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && valido) onConfirmar(valor);
    if (e.key === "Escape") onCancelar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl p-6 space-y-5">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[var(--foreground)]">{forma.descricao}</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Restante:{" "}
            <span className="font-semibold text-[var(--foreground)]">{formataMoeda(valorMaximo)}</span>
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-[var(--muted-foreground)]">Valor a pagar (R$)</label>
          <Input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={valorStr}
            onChange={(e) => setValorStr(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-xl text-center font-semibold"
          />
        </div>

        {!valido && valor > 0 && (
          <p className="text-sm text-[var(--destructive)] text-center">
            Valor máximo: {formataMoeda(valorMaximo)}
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancelar}>
            Cancelar (Esc)
          </Button>
          <Button className="flex-1" disabled={!valido} onClick={() => onConfirmar(valor)}>
            Confirmar (Enter)
          </Button>
        </div>
      </div>
    </div>
  );
}
