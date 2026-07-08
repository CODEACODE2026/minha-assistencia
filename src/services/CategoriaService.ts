import { Categoria, CategoriaAttributes } from '../models/Categoria';
import { Produto } from '../models/Produto';
import { AppError } from '../utils/AppError';

export class CategoriaService {
  static async create(data: Partial<CategoriaAttributes>) {
    return Categoria.create(data as CategoriaAttributes);
  }

  static async list() {
    return Categoria.findAll({ order: [['nome', 'ASC']] });
  }

  static async findById(id: number) {
    const categoria = await Categoria.findByPk(id);

    if (!categoria) {
      throw new AppError('Categoria nao encontrada', 404);
    }

    return categoria;
  }

  static async update(id: number, data: Partial<CategoriaAttributes>) {
    const categoria = await this.findById(id);
    await categoria.update(data);
    return categoria;
  }

  static async delete(id: number) {
    const categoria = await this.findById(id);
    const produtosVinculados = await Produto.count({ where: { categoria_id: id } });

    if (produtosVinculados > 0) {
      throw new AppError('Categoria possui produtos vinculados', 400);
    }

    await categoria.destroy();
  }
}
