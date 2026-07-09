import { Request, Response } from 'express';

import { SimuladorCompraService } from '../services/SimuladorCompraService';
import { successResponse } from '../utils/jsonResponse';

export class SimuladorCompraController {
  static async create(req: Request, res: Response) {
    const simulacao = await SimuladorCompraService.create(req.body);
    return successResponse(res, simulacao, 'Simulacao calculada', 201);
  }

  static async list(_req: Request, res: Response) {
    const simulacoes = await SimuladorCompraService.list();
    return successResponse(res, simulacoes);
  }

  static async update(req: Request, res: Response) {
    const simulacao = await SimuladorCompraService.update(Number(req.params.id), req.body);
    return successResponse(res, simulacao, 'Simulacao alterada');
  }

  static async delete(req: Request, res: Response) {
    await SimuladorCompraService.delete(Number(req.params.id));
    return successResponse(res, null, 'Simulacao removida');
  }
}
