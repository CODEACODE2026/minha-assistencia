import { Request, Response } from 'express';

import { MovimentacaoEstoqueService } from '../services/MovimentacaoEstoqueService';
import { successResponse } from '../utils/jsonResponse';

export class MovimentacaoEstoqueController {
  static async list(req: Request, res: Response) {
    const movimentacoes = await MovimentacaoEstoqueService.list({
      produto_id: req.query.produto_id ? Number(req.query.produto_id) : undefined,
      orcamento_id: req.query.orcamento_id ? Number(req.query.orcamento_id) : undefined
    });
    return successResponse(res, movimentacoes);
  }

  static async create(req: Request, res: Response) {
    const movimentacao = await MovimentacaoEstoqueService.createManual(req.body);
    return successResponse(res, movimentacao, 'Movimentacao registrada', 201);
  }
}
