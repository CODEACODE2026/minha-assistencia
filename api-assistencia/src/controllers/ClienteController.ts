import { Request, Response } from 'express';

import { ClienteService } from '../services/ClienteService';
import { successResponse } from '../utils/jsonResponse';
import { parsePagination } from '../utils/pagination';

export class ClienteController {
  static async create(req: Request, res: Response) {
    const cliente = await ClienteService.create(req.body);
    return successResponse(res, cliente, 'Cliente cadastrado', 201);
  }

  static async list(req: Request, res: Response) {
    const clientes = await ClienteService.list(parsePagination(req.query));
    return successResponse(res, clientes);
  }

  static async findById(req: Request, res: Response) {
    const cliente = await ClienteService.findById(Number(req.params.id));
    return successResponse(res, cliente);
  }

  static async update(req: Request, res: Response) {
    const cliente = await ClienteService.update(Number(req.params.id), req.body);
    return successResponse(res, cliente, 'Cliente atualizado');
  }

  static async delete(req: Request, res: Response) {
    await ClienteService.delete(Number(req.params.id));
    return successResponse(res, null, 'Cliente removido');
  }
}
