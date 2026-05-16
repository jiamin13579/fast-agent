export interface Admin {
  id: number;
  username: string;
  nickname: string;
  isGlobalAdmin: boolean;
}

export interface NamespaceInfo {
  id: number;
  role: "ADMIN" | "VIEWER";
}

export interface LoginResponse {
  token: string;
  admin: Admin;
  namespaces: NamespaceInfo[];
}

export interface AuthMeResponse {
  id: number;
  username: string;
  nickname: string;
  isGlobalAdmin: boolean;
}
