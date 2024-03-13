import { RemoteHttpResolverOverWS } from '../third_party/interceptors/lib/node/RemoteHttpInterceptorWS'
import type {
  Route,
  Request as PWRequest,
  Response as PWResponse,
  Frame,
  Worker,
  APIResponse
} from '@playwright/test'
import { test as base } from '@playwright/test'
import { spawn } from 'node:child_process';
import waitOn from 'wait-on';
import path from 'path'

export type WorkerConfigOptions = {
  webServer: WebServerOptions
};

type WebServerOptions = {
  command: string;
  args: string[];
  url: string;
  cwd?: string;
}

//#region Internal types
type URLMatch = string | RegExp | ((url: URL) => boolean);
type RouteHandlerCallback = (route: Route, request: PWRequest) => Promise<any> | void;
const { ManualPromise, urlMatches } = require("playwright-core/lib/utils")
type InteractiveRequest = globalThis.Request & {
  respondWith(response?: Response): void;
};
//#endregion

class WebServer {
  private _appProcess: import("child_process").ChildProcess | null = null;
  private _resolver: RemoteHttpResolverOverWS | null = null;
  private _routes: RouteHandler[] = [];
  private constructor(private readonly settings: WebServerOptions) { }

  public static async create(settings: WebServerOptions) {
    const webServer = new WebServer(settings);
    await webServer.start();
    return webServer;
  }

  private async start() {
    this._resolver = new RemoteHttpResolverOverWS({
      port: 0,
    })
    this._resolver.apply()
    this._resolver.on('request', async ({ request, requestId }) => this._onRequest(request, requestId))
    this._appProcess = spawn(this.settings.command, this.settings.args, {
      stdio: ['inherit', 'inherit', 'inherit'],
      env: {
        ...process.env,
        NODE_OPTIONS: (process.env.NODE_OPTIONS ?? '') + ` --require ${path.join(__dirname, 'injected.js')}`,
        PW_INTERCEPTOR_PORT: this._resolver.port().toString(),
        PORT: (3000 + test.info().parallelIndex).toString(),
      },
      shell: true,
      cwd: this.settings.cwd,
    })
    if (this.settings.url) {
      await waitOn({
        resources: [this.settings.url],
      })
    }
  }

  private async _onRequest(request: InteractiveRequest, requestId: string) {
    console.log('onRequest', request.url)
    const r = await RequestImpl.create(request)
    // @ts-ignore
    r.requestId = requestId;
    const route = new RouteImpl(r);
    const routeHandlers = this._routes.slice();
    for (const routeHandler of routeHandlers) {
      if (!routeHandler.matches(request.url))
        continue;
      // TODO: expire + indexOf check
      const handled = await routeHandler.handle(route);
      if (handled)
        return;
    }
    await route._innerContinue()
  }

  public async stop() {
    this._resolver?.dispose()
    await new Promise<void>((resolve, reject) => {
      if (!this._appProcess)
        return resolve();
      this._appProcess.on('exit', () => resolve())
      this._appProcess.on('error', reject)
      this._appProcess.kill()
    });
  }

  public route(url: URLMatch, handler: RouteHandlerCallback, options?: { times?: number }): void {
    this._routes.unshift(new RouteHandler(url, handler, options?.times))
  }
}

class RouteImpl implements Route {
  private _handlingPromise: any | null = null;
  constructor(private readonly _request: RequestImpl) {}
  abort(errorCode?: string | undefined): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async continue(options?: { headers?: { [key: string]: string; } | undefined; method?: string | undefined; postData?: any; url?: string | undefined; } | undefined): Promise<void> {
    await this._handleRoute(() => this._innerContinue(options));
  }

  async _innerContinue(options?: { headers?: { [key: string]: string; } | undefined; method?: string | undefined; postData?: any; url?: string | undefined; } | undefined): Promise<void> {
    const request = this._request;
    // @ts-ignore
    console.log('_innerContinue', request.requestId)
    try {
    this._request._request.respondWith(await fetch(new Request(options?.url ?? request.url(), {
      headers: options?.headers ?? request.headers(),
      method: options?.method ?? request.method(),
      body: options?.postData ?? request.postDataBuffer(),
    })));
   } catch (error) {
    // @ts-ignore
    console.log('error', error, request.requestId)
   }
  }

  fallback(options?: { headers?: { [key: string]: string; } | undefined; method?: string | undefined; postData?: any; url?: string | undefined; } | undefined): Promise<void> {
    throw new Error('Method not implemented.');
  }

  fetch(options?: { headers?: { [key: string]: string; } | undefined; maxRedirects?: number | undefined; method?: string | undefined; postData?: any; timeout?: number | undefined; url?: string | undefined; } | undefined): Promise<APIResponse> {
    throw new Error('Method not implemented.');
  }

  async fulfill(options?: { body?: string | Buffer | undefined; contentType?: string | undefined; headers?: { [key: string]: string; } | undefined; json?: any; path?: string | undefined; response?: APIResponse | undefined; status?: number | undefined; } | undefined): Promise<void> {
    await this._handleRoute(async () => {
      const headers = new Headers(options?.headers);
      let body: string | Buffer | undefined = options?.body;
      if (options?.json) {
        body = JSON.stringify(options.json);
        headers.set('Content-Type', 'application/json');
      }
      if (options?.contentType)
        headers.set('Content-Type', options.contentType);
      if (options?.path)
        throw new Error('Not implemented');
      if (options?.response)
        throw new Error('Not implemented');
      this._request._request.respondWith(new Response(body, {
          headers,
          status: options?.status || 200,
          statusText: options?.status ? 'OK' : 'Not Found',
        }))
    });
  }

  request(): PWRequest {
    return this._request;
  }

  public _startHandling() {
    this._handlingPromise = new ManualPromise();
    return this._handlingPromise;
  }

  private async _handleRoute(callback: () => Promise<void>) {
    this._checkNotHandled();
    try {
      await callback();
      this._reportHandled(true);
    } catch (e) {
      throw e;
    }
  }

  _checkNotHandled() {
    if (!this._handlingPromise)
      throw new Error('Route is already handled!');
  }

  _reportHandled(done: boolean) {
    const chain = this._handlingPromise!;
    this._handlingPromise = null;
    chain.resolve(done);
  }
}
class RequestImpl implements PWRequest {
  private constructor(public readonly _request: InteractiveRequest, private readonly _requestPayload: ArrayBuffer) {}

  static async create(request: InteractiveRequest): Promise<RequestImpl> {
    const pwRequest = new RequestImpl(request, await request.arrayBuffer());
    return pwRequest;
  }
  
  async allHeaders(): Promise<{ [key: string]: string; }> {
    return this.headers();
  }
  failure(): { errorText: string; } | null {
    throw new Error('Method not implemented.');
  }
  frame(): Frame {
    throw new Error('Method not implemented.');
  }
  headers(): { [key: string]: string; } {
    return Object.fromEntries(this._request.headers.entries());
  }
  async headersArray(): Promise<{ name: string; value: string; }[]> {
    return Array.from(this._request.headers.entries()).map(([name, value]) => ({ name, value }));
  }
  async headerValue(name: string): Promise<string | null> {
    return this._request.headers.get(name);
  }
  isNavigationRequest(): boolean {
    throw new Error('Method not implemented.');
  }
  method(): string {
    return this._request.method;
  }
  postData(): string | null {
    if (this._requestPayload.byteLength === 0)
      return null;
    return (new TextDecoder()).decode(this._requestPayload);
  }
  postDataBuffer(): Buffer | null {
    if (this._requestPayload.byteLength === 0)
      return null;
    return Buffer.from(this._requestPayload);
  }
  postDataJSON() {
    const body = this.postData();
    if (!body)
      return null;
    return JSON.parse(body);
  }
  redirectedFrom(): PWRequest | null {
    throw new Error('Method not implemented.');
  }
  redirectedTo(): PWRequest | null {
    throw new Error('Method not implemented.');
  }
  resourceType(): string {
    throw new Error('Method not implemented.');
  }
  response(): Promise<PWResponse | null> {
    throw new Error('Method not implemented.');
  }
  serviceWorker(): Worker | null {
    throw new Error('Method not implemented.');
  }
  sizes(): Promise<{ requestBodySize: number; requestHeadersSize: number; responseBodySize: number; responseHeadersSize: number; }> {
    throw new Error('Method not implemented.');
  }
  timing(): { startTime: number; domainLookupStart: number; domainLookupEnd: number; connectStart: number; secureConnectionStart: number; connectEnd: number; requestStart: number; responseStart: number; responseEnd: number; } {
    throw new Error('Method not implemented.');
  }
  url(): string {
    return this._request.url;
  }
}

class ResponseImpl implements PWResponse {
  allHeaders(): Promise<{ [key: string]: string; }> {
    throw new Error('Method not implemented.');
  }
  body(): Promise<Buffer> {
    throw new Error('Method not implemented.');
  }
  finished(): Promise<Error | null> {
    throw new Error('Method not implemented.');
  }
  frame(): Frame {
    throw new Error('Method not implemented.');
  }
  fromServiceWorker(): boolean {
    throw new Error('Method not implemented.');
  }
  headers(): { [key: string]: string; } {
    throw new Error('Method not implemented.');
  }
  headersArray(): Promise<{ name: string; value: string; }[]> {
    throw new Error('Method not implemented.');
  }
  headerValue(name: string): Promise<string | null> {
    throw new Error('Method not implemented.');
  }
  headerValues(name: string): Promise<string[]> {
    throw new Error('Method not implemented.');
  }
  json(): Promise<any> {
    throw new Error('Method not implemented.');
  }
  ok(): boolean {
    throw new Error('Method not implemented.');
  }
  request(): PWRequest {
    throw new Error('Method not implemented.');
  }
  securityDetails(): Promise<{ issuer?: string | undefined; protocol?: string | undefined; subjectName?: string | undefined; validFrom?: number | undefined; validTo?: number | undefined; } | null> {
    throw new Error('Method not implemented.');
  }
  serverAddr(): Promise<{ ipAddress: string; port: number; } | null> {
    throw new Error('Method not implemented.');
  }
  status(): number {
    throw new Error('Method not implemented.');
  }
  statusText(): string {
    throw new Error('Method not implemented.');
  }
  text(): Promise<string> {
    throw new Error('Method not implemented.');
  }
  url(): string {
    throw new Error('Method not implemented.');
  }
}

class RouteHandler {
  constructor(private readonly url: URLMatch, private readonly handler: RouteHandlerCallback, private readonly times?: number) {

  }

  public matches(requestURL: string): boolean {
    return urlMatches(undefined /* baseURL */, requestURL, this.url);
  }

  public async handle(route: RouteImpl): Promise<boolean> {
    var handledPromise = route._startHandling();
    const [handled] = await Promise.all([
      handledPromise,
      this.handler(route, route.request()),
    ])
    return handled;
  }
}

type WorkerFixture = {
  webServer: WebServer;
};

export const test = base.extend<{}, WorkerFixture>({
  webServer: [(async ({ }, use, testInfo) => {
    const settings = (testInfo.project.use as any).webServer as (WebServerOptions | undefined);
    if (!settings)
      throw new Error('webServer is not configured for the project');
    const webserver = await WebServer.create(settings);
    await use(webserver);
    await webserver.stop();
  }), { scope: 'worker' }],
});

export { expect } from '@playwright/test'
