import { Request, Response } from 'express';

import { OrcamentoService } from '../services/OrcamentoService';
import { successResponse } from '../utils/jsonResponse';
import { parsePagination } from '../utils/pagination';

export class OrcamentoController {
  static async create(req: Request, res: Response) {
    const orcamento = await OrcamentoService.create(req.body);
    return successResponse(res, orcamento, 'Orcamento cadastrado', 201);
  }

  static async list(req: Request, res: Response) {
    const orcamentos = await OrcamentoService.list(parsePagination(req.query));
    return successResponse(res, orcamentos);
  }

  static async findById(req: Request, res: Response) {
    const orcamento = await OrcamentoService.findById(Number(req.params.id));
    return successResponse(res, orcamento);
  }

  static async update(req: Request, res: Response) {
    const orcamento = await OrcamentoService.update(Number(req.params.id), req.body);
    return successResponse(res, orcamento, 'Orcamento atualizado');
  }

  static async delete(req: Request, res: Response) {
    await OrcamentoService.delete(Number(req.params.id), {
      estornarEstoque: req.query.estornar_estoque !== 'false'
    });
    return successResponse(res, null, 'Orcamento removido');
  }

  static async pdf(req: Request, res: Response) {
    const pdf = await OrcamentoService.generatePdf(Number(req.params.id));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=orcamento-${req.params.id}.pdf`);
    return res.send(pdf);
  }
}
