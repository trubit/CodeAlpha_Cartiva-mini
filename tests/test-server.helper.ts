/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import type { Application } from 'express';

export interface TestResponse<T = any> {
  status: number;
  body: T;
  headers: Headers;
  cookies: string[];
}

export interface TestServer {
  server: Server;
  baseUrl: string;
  url: string;
  close: () => Promise<void>;
  request: <T = any>(
    path: string,
    options?: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
      cookie?: string;
    }
  ) => Promise<TestResponse<T>>;
}

export const startTestServer = async (app: Application): Promise<TestServer> => {
  let server: Server;
  let baseUrl: string;

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  const requestFn = async <T = any>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
      cookie?: string;
    } = {}
  ): Promise<TestResponse<T>> => {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    };

    if (options.cookie) {
      headers['Cookie'] = options.cookie;
    }

    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers,
      body: isFormData
        ? (options.body as BodyInit)
        : options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
    });

    const setCookieHeaders = res.headers.getSetCookie
      ? res.headers.getSetCookie()
      : res.headers.get('set-cookie')
        ? [res.headers.get('set-cookie')!]
        : [];

    const text = await res.text();
    let body: any = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    return {
      status: res.status,
      body: body as T,
      headers: res.headers,
      cookies: setCookieHeaders,
    };
  };

  const closeFn = async (): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  };

  return {
    server: server!,
    baseUrl: baseUrl!,
    url: baseUrl!,
    close: closeFn,
    request: requestFn,
  };
};
