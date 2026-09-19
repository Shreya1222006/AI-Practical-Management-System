# API Gateway Function-wise Explanation

This file explains the gateway in a simple code-first way. The goal is to understand what each function is doing, not just the full system design.

---

## 1. Main file: services/api-gateway/src/index.ts

This file is the startup file for the gateway.

What it does:

- creates the Express app
- enables CORS
- parses JSON request bodies
- generates a request ID for every incoming request
- applies the global rate limiter
- defines the public health route
- mounts all service routes to their downstream backend services

Important code block:

```ts
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use((req, _res, next) => {
  if (!req.headers['x-request-id']) req.headers['x-request-id'] = uuidv4();
  next();
});

app.use(rateLimiter);

app.get('/health', async (_req, res) => {
  res.json({
    status: 'ok',
    gateway: 'api-gateway',
    services: ['auth', 'users', 'practicals', 'assessments', 'submissions', 'execution', 'files']
  });
});
```

### Route wiring

```ts
//WORKING OF THE PROXYHANDLER: 
//every request starting with /api/auth => is sent to the function proxyHandler(....) =>and that function forwards it to the backend service at http://localhost:4010
app.use('/api/auth', proxyHandler('AUTH_SERVICE_URL', 'http://localhost:4010'));
app.use('/api/users', authMiddleware, proxyHandler('USER_SERVICE_URL', 'http://localhost:4060'));
app.use('/api/practicals', authMiddleware, proxyHandler('PRACTICALS_SERVICE_URL', 'http://localhost:4070'));
app.use('/api/assessments', authMiddleware, proxyHandler('ASSESSMENTS_SERVICE_URL', 'http://localhost:4050'));
app.use('/api/submissions', authMiddleware, proxyHandler('SUBMISSION_SERVICE_URL', 'http://localhost:4020'));
app.use('/api/execution', authMiddleware, proxyHandler('EXECUTION_RUNNER_URL', 'http://localhost:4030'));
app.use('/api/files', authMiddleware, proxyHandler('FILE_SERVICE_URL', 'http://localhost:4040'));
```

This means:

- /api/auth is public
- all other APIs are protected by authMiddleware
- each path goes to a different microservice

---

## 2. What is the gateway doing conceptually?

The gateway is not the business logic layer. It is mainly a:

- entry point
- security layer
- request router
- proxy

So the real logic lives inside the individual services, and the gateway just directs traffic.

---

## 3. Proxy logic: services/api-gateway/src/proxy.ts

This file contains the main request forwarding function.

### Function: resolveTargetUrl

```ts
function resolveTargetUrl(serviceEnvKey: string, path: string, fallbackUrl?: string) {
  const base = process.env[serviceEnvKey] || (config as any)[serviceEnvKey] || fallbackUrl;
  if (!base) throw new Error(`${serviceEnvKey} not configured and no fallback URL provided`);
  return `${base.replace(/\/$/, '')}${path}`;
}
```

What it does:

- reads the service URL from environment variables or config
- builds the final backend URL
- appends the incoming request path

Example:

- /api/users/profile
- service URL = http://localhost:4060
- final target = http://localhost:4060/profile

### Function: proxyHandler

```ts
export function proxyHandler(serviceEnvKey: string, fallbackUrl?: string) {
  const router = Router({ mergeParams: true });
  router.all('/*', async (req: Request, res: Response) => {
    try {
      const target = resolveTargetUrl(serviceEnvKey, req.path.replace(/^\//, '/'), fallbackUrl);
      const cfg: AxiosRequestConfig = {
        url: target,
        method: req.method as any,
        headers: { ...req.headers },
        data: req.body,
        responseType: 'stream',
        validateStatus: () => true
      };
      delete (cfg.headers as any).host;
      const resp = await axios.request(cfg);
      res.status(resp.status);
      Object.entries(resp.headers).forEach(([k, v]) => {
        try { res.setHeader(k, v as string); } catch {}
      });
      if (resp.data && resp.data.pipe) {
        resp.data.pipe(res);
      } else {
        res.send(resp.data);
      }
    } catch (err: any) {
      console.error(`[Proxy Error] ${serviceEnvKey} -> ${req.path}:`, err?.message || err);
      res.status(502).json({ error: 'Bad Gateway', service: serviceEnvKey });
    }
  });
  return router;
}
```

What this function does:

- takes the incoming request
- builds destination URL
- forwards the HTTP method, headers, and body
- removes host header to avoid mismatch issues
- calls the real backend service with axios
- passes the response back to the client
- if backend fails, returns 502 Bad Gateway

This is the core function that makes the gateway act like a reverse proxy.

---

## 4. Auth check: services/api-gateway/src/middleware/auth.ts

This middleware protects routes.

```ts
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authSvc = process.env.AUTH_SERVICE_URL || (config as any).AUTH_SERVICE_URL;
  if (!authSvc) return next(); // no auth configured

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing auth' });

  try {
    const resp = await axios.get(`${authSvc.replace(/\/$/, '')}/me`, { headers: { authorization: auth } });
    if (resp.status === 200) {
      (req as any).user = resp.data;
      return next();
    }
    return res.status(401).json({ error: 'invalid token' });
  } catch (err: any) {
    console.error('auth check failed', err?.response?.data || err.message);
    return res.status(401).json({ error: 'auth failed' });
  }
}
```

What it does:

- checks whether Authorization header exists
- calls auth-service /me
- validates the JWT there
- if valid, attaches req.user and continues
- if invalid, blocks the request with 401

So in simple terms:

- gateway does not trust the request by itself
- it checks with auth-service first

---

## 5. Rate limiter: services/api-gateway/src/middleware/rateLimiter.ts

This is the request throttle function.

```ts
//uses redis if available , else in-memory map.
export async function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  if (REDIS_URL) {
    const r = new IORedis(REDIS_URL);
    try {
      const key = `rl:${ip}`;
      const v = await r.incr(key);
      if (v === 1) await r.expire(key, 60);
      if (v > 100) return res.status(429).json({ error: 'rate limit' });
    } finally { r.disconnect(); }
    return next();
  }
  //this is the functionality we are going to implement functionality using the map here......
  const now = Date.now();
  const entry = map.get(ip) || { count: 0, reset: now + 60_000 };
  if (now > entry.reset) {
    entry.count = 1; entry.reset = now + 60_000;
  } else { entry.count += 1; }
  map.set(ip, entry);
  if (entry.count > 100) return res.status(429).json({ error: 'rate limit' });
  return next();
}
```

What it does:

- identifies the client using IP
- counts requests per minute
- blocks if more than 100 requests in 60 seconds
- uses Redis if available, else in-memory map

This protects the platform from traffic bursts and spam.

---

## 6. Real request flow in one example

### Example: GET /api/users

1. client hits the gateway at port 4000
2. `rateLimiter` checks if the IP is over limit
3. `authMiddleware` checks Authorization header
4. gateway calls auth-service /me with that token
5. if valid, it continues
6. `proxyHandler` resolves the target to http://localhost:4060/users or similar
7. request is forwarded to user-service
8. user-service handles the actual business logic
9. response comes back through the gateway to the client

So the gateway flow is:

`Client -> Gateway -> rateLimiter -> auth -> proxy -> service -> response`

---

## 7. What each part is responsible for

### index.ts
Responsible for app startup and route registration.

### proxy.ts
Responsible for forwarding requests to the correct service.

### auth.ts
Responsible for checking whether the user is logged in.

### rateLimiter.ts
Responsible for limiting abusive or repeated requests.

---

## 8. Very short summary

If you want to understand it in one sentence:

The API Gateway is the front door that validates requests, blocks abuse, confirms user identity, and forwards each request to the correct backend service.

That is the whole purpose of this code.
