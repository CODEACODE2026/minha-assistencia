import { Op } from 'sequelize';

import { Cliente } from '../models/Cliente';
import { DiagnosticoEntrada, DiagnosticoEntradaAttributes } from '../models/DiagnosticoEntrada';
import { DiagnosticoFoto, DiagnosticoFotoTipo } from '../models/DiagnosticoFoto';
import { AppError } from '../utils/AppError';
import { buildPaginatedResult, PaginationParams } from '../utils/pagination';
import { removeUploadDirectory, removeUploadFile, saveBase64Image } from '../utils/uploadStorage';

const include = [
  { model: Cliente, as: 'cliente' },
  { model: DiagnosticoFoto, as: 'fotos' }
];

type FotoInput = {
  arquivo_base64: string;
  nome_arquivo?: string;
  descricao?: string | null;
  tipo_foto?: DiagnosticoFotoTipo;
};

export class DiagnosticoEntradaService {
  static async list(filters: { termo?: string; status?: string; data?: string }, pagination?: PaginationParams) {
    const where: Record<string | symbol, unknown> = {};
    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.data) {
      const start = new Date(`${filters.data}T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      where.createdAt = { [Op.gte]: start, [Op.lt]: end };
    }

    const termo = filters.termo?.trim();
    if (termo) {
      const like = `%${termo}%`;
      where[Op.or] = [
        { aparelho: { [Op.like]: like } },
        { marca: { [Op.like]: like } },
        { modelo: { [Op.like]: like } },
        { defeito_relatado: { [Op.like]: like } },
        { '$cliente.nome$': { [Op.like]: like } }
      ];
    }

    const options = {
      where,
      include,
      order: [['createdAt', 'DESC']] as [string, string][],
      subQuery: false
    };

    if (!pagination?.enabled) {
      return DiagnosticoEntrada.findAll(options);
    }

    const result = await DiagnosticoEntrada.findAndCountAll({
      ...options,
      distinct: true,
      limit: pagination.limit,
      offset: pagination.offset
    });

    return buildPaginatedResult(result.rows, result.count, pagination);
  }

  static async findById(id: number) {
    const diagnostico = await DiagnosticoEntrada.findByPk(id, { include });
    if (!diagnostico) {
      throw new AppError('Diagnostico de entrada nao encontrado', 404);
    }
    return diagnostico;
  }

  static async create(data: Partial<DiagnosticoEntradaAttributes>, usuarioId?: number) {
    const cliente = await Cliente.findByPk(data.cliente_id);
    if (!cliente) {
      throw new AppError('Cliente informado nao existe', 404);
    }

    const diagnostico = await DiagnosticoEntrada.create({
      ...data,
      usuario_id: usuarioId ?? data.usuario_id ?? null,
      status: 'aberto'
    } as DiagnosticoEntradaAttributes);

    return this.findById(diagnostico.id);
  }

  static async update(id: number, data: Partial<DiagnosticoEntradaAttributes>) {
    const diagnostico = await DiagnosticoEntrada.findByPk(id);
    if (!diagnostico) {
      throw new AppError('Diagnostico de entrada nao encontrado', 404);
    }
    if (diagnostico.status === 'finalizado') {
      throw new AppError('Diagnostico finalizado. Confirme a reabertura antes de alterar.', 400);
    }
    if (data.cliente_id) {
      const cliente = await Cliente.findByPk(data.cliente_id);
      if (!cliente) {
        throw new AppError('Cliente informado nao existe', 404);
      }
    }

    await diagnostico.update(data);
    return this.findById(id);
  }

  static async delete(id: number) {
    const diagnostico = await this.findById(id);
    await diagnostico.destroy();
    await removeUploadDirectory(['diagnosticos-entrada', String(id)]);
  }

  static async finish(id: number) {
    const diagnostico = await DiagnosticoEntrada.findByPk(id);
    if (!diagnostico) {
      throw new AppError('Diagnostico de entrada nao encontrado', 404);
    }
    await diagnostico.update({ status: 'finalizado' });
    return this.findById(id);
  }

  static async cancel(id: number) {
    const diagnostico = await DiagnosticoEntrada.findByPk(id);
    if (!diagnostico) {
      throw new AppError('Diagnostico de entrada nao encontrado', 404);
    }
    await diagnostico.update({ status: 'cancelado' });
    return this.findById(id);
  }

  static async addPhotos(id: number, fotos: FotoInput[]) {
    await this.findById(id);
    if (!Array.isArray(fotos) || fotos.length === 0) {
      throw new AppError('Envie ao menos uma foto', 422);
    }

    const savedPhotos = [];
    for (const foto of fotos) {
      const savedFile = await saveBase64Image(foto.arquivo_base64, ['diagnosticos-entrada', String(id)]);

      savedPhotos.push(
        await DiagnosticoFoto.create({
          diagnostico_id: id,
          caminho_arquivo: savedFile.publicPath,
          descricao: foto.descricao ?? null,
          tipo_foto: foto.tipo_foto ?? 'outro'
        })
      );
    }

    return savedPhotos;
  }

  static async deletePhoto(id: number, fotoId: number) {
    const foto = await DiagnosticoFoto.findOne({ where: { id: fotoId, diagnostico_id: id } });
    if (!foto) {
      throw new AppError('Foto nao encontrada', 404);
    }

    await removeUploadFile(foto.caminho_arquivo);
    await foto.destroy();
  }
}
