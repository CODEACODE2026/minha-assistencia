import { Request, Response } from 'express';

import { DashboardService } from '../services/DashboardService';
import { successResponse } from '../utils/jsonResponse';

export class DashboardController {
  static async summary(_req: Request, res: Response) {
    const dashboard = await DashboardService.summary();
    return successResponse(res, dashboard);
  }
}
