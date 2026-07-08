import { Cliente, ClienteAttributes } from '../models/Cliente';
import { AppError } from '../utils/AppError';
import { buildPaginatedResult, PaginationParams } from '../utils/pagination';

export class ClienteService {
  static async create(data: Partial<ClienteAttributes>) {
    return Cliente.create(data as ClienteAttributes);
  }

  static async list(pagination?: PaginationParams) {
    const options = {
      order: [['nome', 'ASC']] as [string, string][]
    };

    if (!pagination?.enabled) {
      return Cliente.findAll(options);
    }

    const result = await Cliente.findAndCountAll({
      ...options,
      limit: pagination.limit,
      offset: pagination.offset
    });

    return buildPaginatedResult(result.rows, result.count, pagination);
  }

  static async findById(id: number) {
    const cliente = await Cliente.findByPk(id);

    if (!cliente) {
      throw new AppError('Cliente nao encontrado', 404);
    }

    return cliente;
  }

  static async update(id: number, data: Partial<ClienteAttributes>) {
    const cliente = await this.findById(id);
    await cliente.update(data);
    return cliente;
  }

  static async delete(id: number) {
    const cliente = await this.findById(id);
    await cliente.destroy();
  }
}
