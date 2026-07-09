import { Request, Response } from 'express';

import { ProdutoService } from '../services/ProdutoService';
import { successResponse } from '../utils/jsonResponse';
import { parsePagination } from '../utils/pagination';

export class ProdutoController {
  static async create(req: Request, res: Response) {
    const produto = await ProdutoService.create(req.body);
    return successResponse(res, produto, 'Produto cadastrado', 201);
  }

  static async list(req: Request, res: Response) {
    const produtos = await ProdutoService.list(parsePagination(req.query));
    return successResponse(res, produtos);
  }

  static async findById(req: Request, res: Response) {
    const produto = await ProdutoService.findById(Number(req.params.id));
    return successResponse(res, produto);
  }

  static async update(req: Request, res: Response) {
    const produto = await ProdutoService.update(Number(req.params.id), req.body);
    return successResponse(res, produto, 'Produto atualizado');
  }

  static async delete(req: Request, res: Response) {
    await ProdutoService.delete(Number(req.params.id));
    return successResponse(res, null, 'Produto removido');
  }

  static async search(req: Request, res: Response) {
    const produtos = await ProdutoService.search(String(req.query.termo || ''));
    return successResponse(res, produtos);
  }
}
