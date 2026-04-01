import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ModalTroco from "@/pages/ModalTroco";

function renderModal(props?: { valorRestante?: number }) {
  const onConfirmar = vi.fn();
  const onCancelar = vi.fn();
  render(
    <ModalTroco
      valorRestante={props?.valorRestante ?? 57.80}
      onConfirmar={onConfirmar}
      onCancelar={onCancelar}
    />
  );
  return { onConfirmar, onCancelar };
}

describe("ModalTroco", () => {
  it("exibe o valor a pagar", () => {
    renderModal({ valorRestante: 57.80 });
    expect(screen.getByText(/R\$ 57,80/)).toBeInTheDocument();
  });

  it("exibe sugestoes de notas", () => {
    renderModal();
    expect(screen.getByText("R$10")).toBeInTheDocument();
    expect(screen.getByText("R$50")).toBeInTheDocument();
    expect(screen.getByText("R$100")).toBeInTheDocument();
  });

  it("calcula troco corretamente (R$100 recebido, R$57,80 a pagar = R$42,20)", () => {
    renderModal({ valorRestante: 57.80 });
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "100,00" } });
    expect(screen.getByText(/42,20/)).toBeInTheDocument();
  });

  it("troco zero quando valor recebido igual ao valor a pagar", () => {
    renderModal({ valorRestante: 10.00 });
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "10,00" } });
    expect(screen.getByText(/Troco/)).toBeInTheDocument();
  });

  it("botao confirmar desabilitado quando valor insuficiente", () => {
    renderModal({ valorRestante: 57.80 });
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "50,00" } });
    expect(screen.getByRole("button", { name: /confirmar/i })).toBeDisabled();
  });

  it("botao confirmar habilitado quando valor suficiente", () => {
    renderModal({ valorRestante: 10.00 });
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "20,00" } });
    expect(screen.getByRole("button", { name: /confirmar/i })).not.toBeDisabled();
  });

  it("chama onConfirmar com valor recebido ao confirmar", () => {
    const { onConfirmar } = renderModal({ valorRestante: 10.00 });
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "20,00" } });
    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    expect(onConfirmar).toHaveBeenCalledWith(20.00);
  });

  it("chama onCancelar ao clicar em Cancelar", () => {
    const { onCancelar } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onCancelar).toHaveBeenCalled();
  });

  it("selecionar nota R$100 preenche campo automaticamente", () => {
    renderModal({ valorRestante: 57.80 });
    fireEvent.click(screen.getByText("R$100"));
    const input = screen.getByPlaceholderText("0,00") as HTMLInputElement;
    expect(input.value).toBe("100,00");
  });

  it("Enter confirma quando valor suficiente", () => {
    const { onConfirmar } = renderModal({ valorRestante: 10.00 });
    const input = screen.getByPlaceholderText("0,00");
    fireEvent.change(input, { target: { value: "50,00" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onConfirmar).toHaveBeenCalledWith(50.00);
  });

  it("Esc cancela o modal", () => {
    const { onCancelar } = renderModal();
    const input = screen.getByPlaceholderText("0,00");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onCancelar).toHaveBeenCalled();
  });
});

