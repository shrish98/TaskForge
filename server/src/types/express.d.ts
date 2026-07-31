import { TokenPayload } from '../utils/token.utils.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
