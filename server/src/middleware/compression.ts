import compression from "compression";
import { Request, Response } from "express";

export const compressionMiddleware = compression({
  level: 6,
  threshold: 1024,
  filter: (req: Request, res: Response) => {
    if (req.headers["x-no-compression"]) {
      return false;
    }
    
    const contentType = res.getHeader("Content-Type") as string;
    if (contentType && /image|video|audio/i.test(contentType)) {
      return false;
    }
    
    return compression.filter(req, res);
  },
  memLevel: 8,
});
