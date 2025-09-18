import 'express-session';

declare module 'express-session' {
  interface SessionData {
    passport?: {
      user?: string;
    };
  }
}

declare global {
  namespace Express {
    interface Request {
      sessionID: string;
    }
  }
}
