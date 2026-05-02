// Rate limiter for the /api/users/login endpoint to slow down brute-force
// attempts on the 6-character secret_key.
//
// Defaults: 5 attempts per IP per 15 minute window. Successful logins are
// excluded so that legitimate users typing the wrong code a couple of times
// are not punished for hours after they finally succeed.

import {NextFunction, Request, RequestHandler, Response} from 'express';
import rateLimit from 'express-rate-limit';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const limiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: MAX_ATTEMPTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: {
      statusCode: 429,
      message: 'Too many login attempts. Please retry in a few minutes.',
    },
  },
});

// Only apply the limiter to the login route. LoopBack registers the middleware
// globally, so we gate it on the request path here.
export const loginRateLimiter: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const path = req.path || req.url || '';
  if (req.method === 'POST' && path.endsWith('/users/login')) {
    return limiter(req, res, next);
  }
  return next();
};
