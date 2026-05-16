import { api } from "./client";
import type { LoginResponse, AuthMeResponse } from "@/types/auth";

export async function login(email: string, password: string): Promise<LoginResponse> {
  return api.post<LoginResponse>("/user/auth/login", { email, password });
}

export async function getMe(): Promise<AuthMeResponse> {
  return api.get<AuthMeResponse>("/user/auth/me");
}
