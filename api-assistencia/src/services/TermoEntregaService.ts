import { Cliente } from '../models/Cliente';
import { Orcamento, OrcamentoAttributes } from '../models/Orcamento';
import { TermoEntrega, TermoEntregaAttributes } from '../models/TermoEntrega';
import { TermoEntregaFoto, TermoEntregaFotoTipo } from '../models/TermoEntregaFoto';
import { AppError } from '../utils/AppError';
import { removeUploadDirectory, removeUploadFile, saveBase64Image } from '../utils/uploadStorage';

const include = [
  { model: Cliente, as: 'cliente' },
  { model: Orcamento, as: 'ordem_servico', include: [{ model: Cliente, as: 'cliente' }] },
  { model: TermoEntregaFoto, as: 'fotos' }
];

type FotoInput = {
  arquivo_base64: string;
  descricao?: string | null;
  tipo_foto?: TermoEntregaFotoTipo;
};

export class TermoEntregaService {
  static async list(filters: { ordemServicoId?: number } = {}) {
    const where: Record<string, unknown> = {};
    if (filters.ordemServicoId) {
      where.ordem_servico_id = filters.ordemServicoId;
    }

    return TermoEntrega.findAll({ where, include, order: [['createdAt', 'DESC']] });
  }

  static async findById(id: number) {
    const termo = await TermoEntrega.findByPk(id, { include });
    if (!termo) {
      throw new AppError('Termo de entrega nao encontrado', 404);
    }
    return termo;
  }

  static async create(data: Partial<TermoEntregaAttributes>, usuarioId?: number) {
    const ordem = await Orcamento.findByPk(data.ordem_servico_id, {
      include: [{ model: Cliente, as: 'cliente' }]
    });

    if (!ordem) {
      throw new AppError('Ordem de servico nao encontrada', 404);
    }

    if (ordem.status !== 'finalizado') {
      throw new AppError('O termo de entrega so pode ser gerado para OS finalizada', 400);
    }

    const existingTerm = await TermoEntrega.findOne({ where: { ordem_servico_id: ordem.id } });
    if (existingTerm) {
      throw new AppError('Esta OS ja possui termo de entrega. Edite ou gere o PDF do termo existente.', 400);
    }

    const ordemData = ordem.get({ plain: true }) as OrcamentoAttributes & { cliente?: Cliente };
    const termo = await TermoEntrega.create({
      ordem_servico_id: ordem.id,
      cliente_id: ordem.cliente_id,
      usuario_id: usuarioId ?? data.usuario_id ?? null,
      garantia_dias: Number(data.garantia_dias ?? 90),
      cobertura_garantia: data.cobertura_garantia ?? 'Garantia valida para pecas e mao de obra executadas.',
      servico_realizado: data.servico_realizado || ordemData.servico,
      testes_finais: data.testes_finais ?? null,
      observacoes_entrega: data.observacoes_entrega ?? null,
      data_entrega: data.data_entrega ?? new Date()
    } as TermoEntregaAttributes);

    return this.findById(termo.id);
  }

  static async update(id: number, data: Partial<TermoEntregaAttributes>) {
    const termo = await TermoEntrega.findByPk(id);
    if (!termo) {
      throw new AppError('Termo de entrega nao encontrado', 404);
    }

    await termo.update(data);
    return this.findById(id);
  }

  static async delete(id: number) {
    const termo = await this.findById(id);
    await termo.destroy();
    await removeUploadDirectory(['termos-entrega', String(id)]);
  }

  static async addPhotos(id: number, fotos: FotoInput[]) {
    await this.findById(id);
    if (!Array.isArray(fotos) || fotos.length === 0) {
      throw new AppError('Envie ao menos uma foto', 422);
    }

    const savedPhotos = [];
    for (const foto of fotos) {
      const savedFile = await saveBase64Image(foto.arquivo_base64, ['termos-entrega', String(id)]);

      savedPhotos.push(
        await TermoEntregaFoto.create({
          termo_entrega_id: id,
          foto: savedFile.publicPath,
          descricao: foto.descricao ?? null,
          tipo_foto: foto.tipo_foto ?? 'outra'
        })
      );
    }

    return savedPhotos;
  }

  static async deletePhoto(id: number, fotoId: number) {
    const foto = await TermoEntregaFoto.findOne({ where: { id: fotoId, termo_entrega_id: id } });
    if (!foto) {
      throw new AppError('Foto nao encontrada', 404);
    }

    await removeUploadFile(foto.foto);
    await foto.destroy();
  }
}
