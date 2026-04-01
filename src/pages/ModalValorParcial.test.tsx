import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ModalValorParcial from "@/pages/ModalValorParcial";
import type { FormaPagamento } from "@/types/pdv";

const pix: FormaPagamento = { id: 4, descricao: "PIX", tipo: "P" };
const cartao: FormaPagamento = { id: 3, descricao: "Cartão Crédito", tipo: "C" };

describe("ModalValorParcial", () => {
  it("exibe nome da forma de pagamento", () => {
    render(<ModalValorParcial forma={pix} valorMaximo={50} onConfirmar={vi.fn()} onCancelar={vi.fn()} />);
    expect(screen.getByText("PIX")).toBeInTheDocument();
  });

  it("exibe valor máximo (restante) formatado", () => {
    render(<ModalValorParcial forma={pix} valorMaximo={50} onConfirmar={vi.fn()} onCancelar={vi.fn()} />);
    expect(screen.getByText(/restante/i)).toBeInTheDocument();
  });

  it("preenche input com valor padrão igual ao valorMaximo", () => {
    render(<ModalValorParcial forma={pix} valorMaximo={50} onConfirmar={vi.fn()} onCancelar={vi.fn()} />);
    expect(screen.getByDisplayValue("50,00")).toBeInTheDocument();
  });

  it("botão Confirmar habilitado com valor padrão válido", () => {
    render(<ModalValorParcial forma={pix} valorMaximo={50} onConfirmar={vi.fn()} onCancelar={vi.fn()} />);
    expect(screen.getByRole("button", { name: /confirmar/i })).not.toBeDisabled();
  });

  it("botão Confirmar desabilitado com valor zero", () => {
    render(<ModalValorParcial forma={pix} valorMaximo={50} onConfirmar={vi.fn()} onCancelar={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "0" } });
    expect(screen.getByRole("button", { name: /confirmar/i })).toBeDisabled();
  });

  it("botão Confirmar desabilitado com valor maior que valorMaximo", () => {
    render(<ModalValorParcial forma={pix} valorMaximo={50} onConfirmar={vi.fn()} onCancelar={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "60,00" } });
    expect(screen.getByRole("button", { name: /confirmar/i })).toBeDisabled();
  });

  it("exibe mensagem de erro quando valor excede o máximo", () => {
    render(<ModalValorParcial forma={pix} valorMaximo={50} onConfirmar={vi.fn()} onCancelar={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "60,00" } });
    expect(screen.getByText(/valor máximo/i)).toBeInTheDocument();
  });

  it("chama onConfirmar com valor correto ao clicar", () => {
    const onConfirmar = vi.fn();
    render(<ModalValorParcial forma={pix} valorMaximo={50} onConfirmar={onConfirmar} onCancelar={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "30,00" } });
    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    expect(onConfirmar).toHaveBeenCalledWith(30);
  });

  it("chama onConfirmar com valor padrão ao pressionar Enter", () => {
    const onConfirmar = vi.fn();
    render(<ModalValorParcial forma={pix} valorMaximo={50} onConfirmar={onConfirmar} onCancelar={vi.fn()} />);
    fireEvent.keyDown(screen.getByPlaceholderText("0,00"), { key: "Enter" });
    expect(onConfirmar).toHaveBeenCalledWith(50);
  });

  it("chama onCancelar ao clicar em Cancelar", () => {
    const onCancelar = vi.fn();
    render(<ModalValorParcial forma={pix} valorMaximo={50} onConfirmar={vi.fn()} onCancelar={onCancelar} />);
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onCancelar).toHaveBeenCalled();
  });

  it("chama onCancelar ao pressionar Escape", () => {
    const onCancelar = vi.fn();
    render(<ModalValorParcial forma={pix} valorMaximo={50} onConfirmar={vi.fn()} onCancelar={onCancelar} />);
    fireEvent.keyDown(screen.getByPlaceholderText("0,00"), { key: "Escape" });
    expect(onCancelar).toHaveBeenCalled();
  });

  it("não chama onConfirmar com Enter quando valor inválido", () => {
    const onConfirmar = vi.fn();
    render(<ModalValorParcial forma={pix} valorMaximo={50} onConfirmar={onConfirmar} onCancelar={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "0" } });
    fireEvent.keyDown(screen.getByPlaceholderText("0,00"), { key: "Enter" });
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("aceita valor com vírgula como decimal", () => {
    const onConfirmar = vi.fn();
    render(<ModalValorParcial forma={cartao} valorMaximo={100} onConfirmar={onConfirmar} onCancelar={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "45,50" } });
    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    expect(onConfirmar).toHaveBeenCalledWith(45.5);
  });
});
