import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';

interface RegisterAdminInput {
  nome: string;
  email: string;
  senha: string;
}

interface LoginInput {
  email: string;
  senha: string;
}

export class AuthService {
  static async registerAdmin(data: RegisterAdminInput) {
    const existingUser = await User.findOne({ where: { email: data.email } });

    if (existingUser) {
      throw new AppError('Email ja cadastrado', 409);
    }

    const senha_hash = await bcrypt.hash(data.senha, 10);

    const user = await User.create({
      nome: data.nome,
      email: data.email,
      senha_hash,
      role: 'admin'
    });

    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role
    };
  }

  static async login(data: LoginInput) {
    const user = await User.findOne({ where: { email: data.email } });

    if (!user) {
      throw new AppError('Email ou senha invalidos', 401);
    }

    const passwordMatches = await bcrypt.compare(data.senha, user.senha_hash);

    if (!passwordMatches) {
      throw new AppError('Email ou senha invalidos', 401);
    }

    const token = jwt.sign({ email: user.email, role: user.role }, env.jwtSecret, {
      subject: String(user.id),
      expiresIn: '8h'
    });

    return {
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role
      }
    };
  }
}
