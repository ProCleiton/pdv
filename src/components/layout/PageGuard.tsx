import { ShieldX } from "lucide-react";
import { usePermissao } from "@/hooks/usePermissao";
import { Button } from "@/components/ui/Button";

interface PageGuardProps {
  pageId: string;
  onVoltar?: () => void;
  children: React.ReactNode;
}

/**
 * Renderiza os filhos apenas se o usuário tiver podeVer=true para o módulo.
 * Exibe tela de acesso negado com botão Voltar caso contrário.
 *
 * No PDV, sempre forneça `onVoltar` para evitar que o usuário fique preso.
 */
export function PageGuard({ pageId, onVoltar, children }: PageGuardProps) {
  const { podeVer } = usePermissao(pageId);

  if (!podeVer) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--muted-foreground)] p-8">
        <ShieldX className="h-12 w-12 opacity-40" />
        <p className="text-base font-semibold text-[var(--foreground)]">Acesso negado</p>
        <p className="text-sm opacity-70 text-center">
          Você não tem permissão para acessar esta área.
          <br />
          Contate o administrador do sistema.
        </p>
        {onVoltar && (
          <Button variant="outline" onClick={onVoltar} className="mt-2">
            ← Voltar
          </Button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
