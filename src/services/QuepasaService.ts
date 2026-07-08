import axios from 'axios';

import { env } from '../config/env';
import { AppError } from '../utils/AppError';

interface SendMessageInput {
  telefone: string;
  mensagem: string;
}

export class QuepasaService {
  static async sendMessage({ telefone, mensagem }: SendMessageInput) {
    if (!env.quepasa.baseUrl || !env.quepasa.token) {
      return {
        enviado: false,
        provider: 'quepasa',
        message: 'Integracao Quepasa ainda nao configurada',
        telefone,
        mensagem
      };
    }

    try {
      const response = await axios.post(
        `${env.quepasa.baseUrl}/message/text`,
        {
          phone: telefone,
          message: mensagem
        },
        {
          headers: {
            Authorization: `Bearer ${env.quepasa.token}`
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new AppError('Falha ao enviar mensagem pelo Quepasa', 502, error);
    }
  }
}
