import { getLang, tr } from "./i18n";
import { API_MESSAGES } from "./api-messages";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  status: number;
  messageCode?: string;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, messageCode?: string, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.messageCode = messageCode;
    this.errors = errors;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("auth_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem("auth_token", token);
  } else {
    window.localStorage.removeItem("auth_token");
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
};

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();

  let url = `${API_BASE_URL}${path}`;
  if (options.query) {
    const params = new URLSearchParams();
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
  }

  // FormData (file uploads) must be sent as-is: the browser sets the multipart Content-Type with its boundary itself.
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      Accept: "application/json",
      "X-Locale": getLang(),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
    cache: "no-store"
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(
      (payload?.message_code && API_MESSAGES[payload.message_code]) ?? payload?.message ?? tr("Đã có lỗi xảy ra, vui lòng thử lại."),
      response.status,
      payload?.message_code,
      payload?.errors
    );
  }

  return payload as T;
}

export const api = {
  get: <T = unknown>(path: string, query?: RequestOptions["query"]) => apiRequest<T>(path, { method: "GET", query }),
  post: <T = unknown>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body }),
  postForm: <T = unknown>(path: string, body: FormData) => apiRequest<T>(path, { method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body }),
  delete: <T = unknown>(path: string) => apiRequest<T>(path, { method: "DELETE" })
};
