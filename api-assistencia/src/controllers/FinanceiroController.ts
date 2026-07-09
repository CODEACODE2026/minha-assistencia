import { Request, Response } from 'express';

import { FinanceiroService } from '../services/FinanceiroService';
import { successResponse } from '../utils/jsonResponse';

export class FinanceiroController {
  static async summary(req: Request, res: Response) {
    const financeiro = await FinanceiroService.summary({
      periodo: req.query.periodo as string | undefined,
      inicio: req.query.inicio as string | undefined,
      fim: req.query.fim as string | undefined,
      origem: req.query.origem as string | undefined
    });

    return successResponse(res, financeiro);
  }
}
