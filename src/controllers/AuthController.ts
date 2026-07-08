import { Request, Response } from 'express';

import { AuthService } from '../services/AuthService';
import { successResponse } from '../utils/jsonResponse';

export class AuthController {
  static async registerAdmin(req: Request, res: Response) {
    const user = await AuthService.registerAdmin(req.body);
    return successResponse(res, user, 'Usuario admin cadastrado', 201);
  }

  static async login(req: Request, res: Response) {
    const data = await AuthService.login(req.body);
    return successResponse(res, data, 'Login realizado com sucesso');
  }

  static me(req: Request, res: Response) {
    return successResponse(res, { user: req.user });
  }
}
