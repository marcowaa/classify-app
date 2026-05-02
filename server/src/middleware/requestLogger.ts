import { Request, Response, NextFunction } from "express";
import { generateRequestId, logRequest, logResponse } from "../utils/logger";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      userId?: string;
    }
  }
}

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  req.requestId = requestId;
  
  res.setHeader("X-Request-ID", requestId);
  
  logRequest(requestId, req.method, req.path, req.userId);
  
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    logResponse(requestId, req.method, req.path, res.statusCode, duration, req.userId);
  });
  
  next();
}
