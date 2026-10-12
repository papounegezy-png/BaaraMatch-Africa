import { QueryClient, QueryFunction } from "@tanstack/react-query";

export type ApiError = Error & { status: number };

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    // Every route in this app responds with {"message": "..."} on error —
    // surface that clean text instead of gluing the status code onto the
    // raw (often-JSON) body, which is what every caller's error.message
    // ends up showing a user (toast, dialog, etc).
    let message = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.message === "string") {
        message = parsed.message;
      }
    } catch {
      // Not JSON — fall back to the raw text as-is.
    }
    // Attaching the status lets a caller distinguish e.g. a 403 permission
    // gate from a generic failure without parsing the message text.
    const error = new Error(message) as ApiError;
    error.status = res.status;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
