declare module "prerender-node" {
  import type { NextFunction, Request, Response } from "express";

  interface PrerenderMiddleware {
    (req: Request, res: Response, next: NextFunction): void;
    set(name: string, value: unknown): PrerenderMiddleware;
    blacklisted(rules: Array<string | RegExp>): PrerenderMiddleware;
    whitelisted(rules: Array<string | RegExp>): PrerenderMiddleware;
  }

  const prerender: PrerenderMiddleware;
  export default prerender;
}
