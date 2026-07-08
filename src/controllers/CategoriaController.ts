import { Request, Response } from 'express';

import { CategoriaService } from '../services/CategoriaService';
import { successResponse } from '../utils/jsonResponse';

export class CategoriaController {
  static async create(req: Request, res: Response) {
    const categoria = await CategoriaService.create(req.body);
    return successResponse(res, categoria, 'Categoria cadastrada', 201);
  }

  static async list(_req: Request, res: Response) {
    const categorias = await CategoriaService.list();
    return successResponse(res, categorias);
  }

  static async findById(req: Request, res: Response) {
    const categoria = await CategoriaService.findById(Number(req.params.id));
    return successResponse(res, categoria);
  }

  static async update(req: Request, res: Response) {
    const categoria = await CategoriaService.update(Number(req.params.id), req.body);
    return successResponse(res, categoria, 'Categoria atualizada');
  }

  static async delete(req: Request, res: Response) {
    await CategoriaService.delete(Number(req.params.id));
    return successResponse(res, null, 'Categoria removida');
  }
}
