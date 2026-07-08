import { UserAttributes } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: Pick<UserAttributes, 'id' | 'nome' | 'email' | 'role'>;
    }
  }
}

export {};
