import { api } from "./client";
import type { LoginResponse, AuthMeResponse } from "@/types/auth";

export async function login(username: string, password: string): Promise<LoginResponse> {
  return api.post<LoginResponse>("/admin/auth/login", { username, password });
}

export async function getMe(): Promise<AuthMeResponse> {
  return api.get<AuthMeResponse>("/admin/auth/me");
}
