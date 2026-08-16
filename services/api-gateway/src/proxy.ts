import axios, { AxiosRequestConfig } from 'axios';
import { Request, Response, Router } from 'express';
import { getConfig } from '../../libs/shared/config';

const config = getConfig();

function resolveTargetUrl(serviceEnvKey: string, path: string) {
  const base = process.env[serviceEnvKey] || (config as any)[serviceEnvKey];
  if (!base) throw new Error(`${serviceEnvKey} not configured`);
  return `${base.replace(/\/$/, '')}${path}`;
}

export function proxyHandler(serviceEnvKey: string) {
  const router = Router({ mergeParams: true });
  router.all('/*', async (req: Request, res: Response) => {
    try {
      const target = resolveTargetUrl(serviceEnvKey, req.path.replace(/^\//, '/'));
      const cfg: AxiosRequestConfig = {
        url: target,
        method: req.method as any,
        headers: { ...req.headers },
        data: req.body,
        responseType: 'stream',
        validateStatus: () => true
      };
      // remove host to avoid host header mismatch
      delete (cfg.headers as any).host;
      const resp = await axios.request(cfg);
      res.status(resp.status);
      // copy headers
      Object.entries(resp.headers).forEach(([k, v]) => { try { res.setHeader(k, v as string); } catch {} });
      if (resp.data && resp.data.pipe) {
        resp.data.pipe(res);
      } else {
        res.send(resp.data);
      }
    } catch (err: any) {
      console.error('proxy error', err?.message || err);
      res.status(502).json({ error: 'bad gateway' });
    }
  });
  return router;
}
