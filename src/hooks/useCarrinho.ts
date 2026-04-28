import { useState } from "react";
import type { ItemCarrinho, Produto } from "@/types/pdv";

export function useCarrinho() {
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [itemSelecionadoIdx, setItemSelecionadoIdx] = useState<number | null>(null);

  const totalCarrinho = carrinho.reduce(
    (acc, item) => acc + (item.precoUnitario - item.desconto) * item.quantidade,
    0
  );

  function adicionarAoCarrinho(produto: Produto, qtd = 1) {
    setCarrinho((prev) => {
      const idx = prev.findIndex((item) => item.produto.id === produto.id);
      if (idx >= 0) {
        const atualizado = [...prev];
        atualizado[idx] = { ...atualizado[idx], quantidade: atualizado[idx].quantidade + qtd };
        return atualizado;
      }
      return [...prev, { produto, quantidade: qtd, precoUnitario: produto.precoVenda, desconto: 0 }];
    });
  }

  function removerItem(idx: number) {
    setCarrinho((prev) => prev.filter((_, i) => i !== idx));
    if (itemSelecionadoIdx === idx) setItemSelecionadoIdx(null);
  }

  function alterarQuantidade(idx: number, novaQtd: number) {
    if (novaQtd <= 0) { removerItem(idx); return; }
    setCarrinho((prev) => {
      const atualizado = [...prev];
      atualizado[idx] = { ...atualizado[idx], quantidade: novaQtd };
      return atualizado;
    });
  }

  return {
    carrinho,
    setCarrinho,
    itemSelecionadoIdx,
    setItemSelecionadoIdx,
    totalCarrinho,
    adicionarAoCarrinho,
    removerItem,
    alterarQuantidade,
  };
}
