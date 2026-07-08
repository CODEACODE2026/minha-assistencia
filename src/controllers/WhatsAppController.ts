import { Request, Response } from 'express';

import { QuepasaService } from '../services/QuepasaService';
import { successResponse } from '../utils/jsonResponse';

export class WhatsAppController {
  static async send(req: Request, res: Response) {
    const result = await QuepasaService.sendMessage(req.body);
    return successResponse(res, result, 'Processamento de envio concluido');
  }

  static async webhook(req: Request, res: Response) {
    return successResponse(res, { recebido: true, payload: req.body }, 'Webhook recebido');
  }
}
