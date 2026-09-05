import axios, { type InternalAxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Where the app talks to.
 *
 * Production is a public HTTPS URL, so any device on any network can reach it —
 * no LAN IP, no firewall rule, no "same Wi-Fi" requirement.
 *
 * To point at a server running on this machine instead, set EXPO_PUBLIC_API_URL
 * before starting Expo:
 *   Expo Go on a phone   -> http://<your-LAN-IP>:3001   (and allow port 3001
 *                            through the firewall)
 *   Android emulator     -> http://10.0.2.2:3001
 *   iOS simulator        -> http://localhost:3001
 */
const PRODUCTION_API_URL = "https://baby-tracker-app-api.vercel.app";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  // Serverless functions cold-start, and a phone on mobile data adds latency on
  // top; 10s was tight enough to time out a first request that would have
  // succeeded.
  timeout: 20000,
});

// Inject token on every request
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem("babytracker_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
  return config;
});

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/**
 * Called when the server rejects our token. Registered by AuthProvider so an
 * expired session drops the user back to the sign-in screen with an
 * explanation, instead of every screen quietly failing to load.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

/**
 * Statuses worth sending the same request again for.
 *
 * All three mean "not now", never "not ever": 503 is the API saying the
 * database is busy or unreachable (see friendlyPrismaMessage), and 502/504 are
 * the platform saying the function didn't answer in time. None of them are a
 * verdict on the request itself, so the useful response is to ask again rather
 * than to show a parent an error for something that would have worked.
 *
 * A 500 is deliberately not here. That is the API calling something a bug, and
 * repeating a request that hit a bug just hits it three times.
 */
const RETRY_STATUSES = new Set([502, 503, 504]);

/**
 * Only where sending the request twice is the same as sending it once. GET and
 * HEAD read; DELETE /active-timers is written to be idempotent precisely so a
 * lost release can be re-sent (a lock that is already gone is a no-op, not an
 * error). POST is absent on purpose — retrying one would log the same feed
 * twice, which is a far worse outcome than the failure it was papering over.
 */
const RETRY_METHODS = new Set(["get", "head", "delete"]);

const MAX_RETRIES = 2;
const RETRY_BASE_MS = 300;

/**
 * Exponential, with jitter — because the failure this exists for is contention,
 * and the whole screen's requests fail together. Retrying them all at the same
 * instant would just recreate the burst that caused it; spreading them out is
 * most of the point.
 */
function retryDelay(attempt: number): number {
  return RETRY_BASE_MS * 2 ** (attempt - 1) * (0.5 + Math.random());
}

type RetriedConfig = InternalAxiosRequestConfig & { __retryCount?: number };

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config as RetriedConfig | undefined;
    const status: number | undefined = error?.response?.status;

    // Try again before deciding this is something to tell anyone about. The
    // retry re-enters the request interceptor, so it carries a fresh token.
    if (
      config &&
      status !== undefined &&
      RETRY_STATUSES.has(status) &&
      RETRY_METHODS.has((config.method ?? "get").toLowerCase()) &&
      (config.__retryCount ?? 0) < MAX_RETRIES
    ) {
      config.__retryCount = (config.__retryCount ?? 0) + 1;
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay(config.__retryCount as number))
      );
      return apiClient(config);
    }

    // Sign-in and sign-up answer 401 for a wrong password; that's a normal
    // failed attempt, not an expired session, so it must not sign anyone out.
    const url = config?.url ?? "";
    const isAuthAttempt = url.includes("/auth/");
    if (status === 401 && !isAuthAttempt) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
