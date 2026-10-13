// frontend/src/services/api.ts
//
// AgriLedger AI - Centralized API Client
//
// IMPORTANT:
// Every frontend API request should go through this file.
//
// Frontend:
//     http://localhost:5173
//
// Backend:
//     http://localhost:5000
//
// Vite proxies /api/* to Flask.
//

const API_BASE_URL = "/api";


/* ============================================================
   API ERROR
============================================================ */

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(
    status: number,
    message: string,
    payload?: unknown
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}


/* ============================================================
   UNAUTHORIZED HANDLER
============================================================ */

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(
  handler: (() => void) | null
): void {
  unauthorizedHandler = handler;
}


/* ============================================================
   REQUEST OPTIONS
============================================================ */

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

  /*
   * unknown allows any normal JSON object/interface.
   * This avoids TypeScript errors when passing typed objects such as
   * CreateFarmerData, UpdateFarmerData, etc.
   */
  body?: unknown | FormData | null;

  signal?: AbortSignal;

  /*
   * Used by /auth/me so an expected 401 does not immediately
   * trigger the global logout handler.
   */
  silent401?: boolean;
}


/* ============================================================
   CENTRAL REQUEST FUNCTION
============================================================ */

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {

  const {
    method = "GET",
    body = null,
    signal,
    silent401 = false,
  } = options;


  /* ----------------------------------------------------------
     BUILD URL
  ---------------------------------------------------------- */

  const url = path.startsWith("/")
    ? `${API_BASE_URL}${path}`
    : `${API_BASE_URL}/${path}`;


  /* ----------------------------------------------------------
     HEADERS
  ---------------------------------------------------------- */

  const headers: Record<string, string> = {
    Accept: "application/json",
  };


  /* ----------------------------------------------------------
     REQUEST BODY
  ---------------------------------------------------------- */

  let payload: BodyInit | undefined;


  /*
   * FormData:
   *
   * Do NOT manually set Content-Type.
   * The browser automatically creates the multipart boundary.
   */
  if (body instanceof FormData) {

    payload = body;

  }

  /*
   * JSON:
   *
   * Any normal object/interface can be passed here.
   */
  else if (
    body !== null &&
    body !== undefined
  ) {

    headers["Content-Type"] =
      "application/json";

    payload = JSON.stringify(body);
  }


  /* ----------------------------------------------------------
     FETCH
  ---------------------------------------------------------- */

  let response: Response;

  try {

    response = await fetch(url, {
      method,
      headers,
      body: payload,

      /*
       * VERY IMPORTANT:
       *
       * Sends the Flask authentication session cookie.
       */
      credentials: "include",

      signal,
    });

  } catch (networkError) {

    throw new ApiError(
      0,
      "Cannot reach the AgriLedger backend. Make sure Flask is running on http://localhost:5000.",
      networkError
    );
  }


  /* ----------------------------------------------------------
     NO CONTENT
  ---------------------------------------------------------- */

  if (response.status === 204) {

    return undefined as T;
  }


  /* ----------------------------------------------------------
     READ RESPONSE
  ---------------------------------------------------------- */

  const contentType =
    response.headers.get("content-type") || "";

  const isJson =
    contentType.includes("application/json");


  const data = isJson
    ? await response.json().catch(() => null)
    : await response.text();


  /* ----------------------------------------------------------
     ERROR RESPONSE
  ---------------------------------------------------------- */

  if (!response.ok) {

    /*
     * If backend says 401, notify AuthContext.
     */
    if (
      response.status === 401 &&
      !silent401 &&
      unauthorizedHandler
    ) {

      unauthorizedHandler();
    }


    let message =
      `Request failed with status ${response.status}`;


    if (
      isJson &&
      data &&
      typeof data === "object"
    ) {

      const errorData =
        data as Record<string, unknown>;


      if (
        errorData.error !== undefined &&
        errorData.error !== null
      ) {

        message =
          String(errorData.error);

      } else if (
        errorData.message !== undefined &&
        errorData.message !== null
      ) {

        message =
          String(errorData.message);
      }
    }


    throw new ApiError(
      response.status,
      message,
      data
    );
  }


  /* ----------------------------------------------------------
     SUCCESS
  ---------------------------------------------------------- */

  return data as T;
}


/* ============================================================
   API CLIENT
============================================================ */

export const api = {

  /* ----------------------------------------------------------
     GET
  ---------------------------------------------------------- */

  get: <T>(
    path: string,
    options?: Omit<
      RequestOptions,
      "method" | "body"
    >
  ): Promise<T> => {

    return request<T>(
      path,
      {
        ...options,
        method: "GET",
      }
    );
  },


  /* ----------------------------------------------------------
     POST
  ---------------------------------------------------------- */

  post: <T>(
    path: string,
    body?: unknown | FormData,
    options?: Omit<
      RequestOptions,
      "method" | "body"
    >
  ): Promise<T> => {

    return request<T>(
      path,
      {
        ...options,
        method: "POST",
        body: body ?? null,
      }
    );
  },


  /* ----------------------------------------------------------
     PUT
  ---------------------------------------------------------- */

  put: <T>(
    path: string,
    body?: unknown | FormData,
    options?: Omit<
      RequestOptions,
      "method" | "body"
    >
  ): Promise<T> => {

    return request<T>(
      path,
      {
        ...options,
        method: "PUT",
        body: body ?? null,
      }
    );
  },


  /* ----------------------------------------------------------
     PATCH
  ---------------------------------------------------------- */

  patch: <T>(
    path: string,
    body?: unknown | FormData,
    options?: Omit<
      RequestOptions,
      "method" | "body"
    >
  ): Promise<T> => {

    return request<T>(
      path,
      {
        ...options,
        method: "PATCH",
        body: body ?? null,
      }
    );
  },


  /* ----------------------------------------------------------
     DELETE
  ---------------------------------------------------------- */

  delete: <T>(
    path: string,
    options?: Omit<
      RequestOptions,
      "method" | "body"
    >
  ): Promise<T> => {

    return request<T>(
      path,
      {
        ...options,
        method: "DELETE",
      }
    );
  },
};


export default api;