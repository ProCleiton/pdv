export interface UsuarioPDV {
  id: number;
  login: string;
  nome: string;
  tipo: string;
  codigoPerfil: number;
  nomePerfil: string;
  codigoEstabelecimento: number;
  codigoFuncionario: number;
}

export function getUsuarioLogado(): UsuarioPDV | null {
  const raw = localStorage.getItem("usuario");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UsuarioPDV;
  } catch {
    return null;
  }
}

export function isAutenticado(): boolean {
  return !!localStorage.getItem("token");
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  localStorage.removeItem("pdv:licenca");
  localStorage.removeItem("pdv:turnoId");
}
