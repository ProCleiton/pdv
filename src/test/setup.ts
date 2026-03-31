import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock do Tauri invoke — não disponível no jsdom
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

// Limpar localStorage antes de cada teste
beforeEach(() => {
  localStorage.clear();
});
