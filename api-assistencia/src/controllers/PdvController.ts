import { Request, Response } from 'express';

import { PdvService } from '../services/PdvService';
import { successResponse } from '../utils/jsonResponse';

export class PdvController {
  static async listVendas(req: Request, res: Response) {
    const vendas = await PdvService.listVendas(req.query);
    return successResponse(res, vendas);
  }

  static async createVenda(req: Request, res: Response) {
    const venda = await PdvService.createVenda(req.body, req.user?.id);
    return successResponse(res, venda, 'Venda concluida', 201);
  }

  static async findVenda(req: Request, res: Response) {
    const venda = await PdvService.findById(Number(req.params.id));
    return successResponse(res, venda);
  }

  static async cancelVenda(req: Request, res: Response) {
    const venda = await PdvService.cancelVenda(Number(req.params.id), req.body, req.user?.id);
    return successResponse(res, venda, 'Venda cancelada');
  }

  static async reciboVenda(req: Request, res: Response) {
    const pdf = await PdvService.reciboPdf(Number(req.params.id), req.body?.company);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=\"recibo-pdv-${req.params.id}.pdf\"`);
    return res.send(pdf);
  }
}
