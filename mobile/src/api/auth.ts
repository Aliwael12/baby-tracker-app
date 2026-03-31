import apiClient from "./client";

export interface AccountInfo {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  account: AccountInfo;
}

export async function signup(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>("/auth/signup", {
    name,
    email,
    password,
  });
  return res.data;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>("/auth/login", {
    email,
    password,
  });
  return res.data;
}

export interface Baby {
  id: number;
  name: string;
  dob: string | null;
  gender: "girl" | "boy";
  createdAt: string;
}

export interface Profile {
  id: number;
  displayName: string;
}

export interface MeResponse {
  account: AccountInfo;
  babies: Baby[];
  profiles: Profile[];
}

export async function getMe(): Promise<MeResponse> {
  const res = await apiClient.get<MeResponse>("/me");
  return res.data;
}
