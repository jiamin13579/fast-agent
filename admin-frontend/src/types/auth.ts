export interface User {
  id: number;
  email: string;
  nickname: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
}

export interface NamespaceInfo {
  id: number;
  name: string;
  role: "ADMIN" | "USER";
}

export interface LoginResponse {
  token: string;
  user: User;
  namespaces: NamespaceInfo[];
}

export interface AuthMeResponse {
  user: User;
  namespaces: NamespaceInfo[];
}
