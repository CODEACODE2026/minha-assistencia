import { randomUUID } from 'crypto';
import { mkdir, rm, writeFile } from 'fs/promises';
import path from 'path';

import { AppError } from './AppError';

const maxImageBytes = 5 * 1024 * 1024;
const allowedMimeTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

function assertSafeSegment(segment: string) {
  if (!segment || segment.includes('..') || segment.includes('/') || segment.includes('\\')) {
    throw new AppError('Caminho de upload invalido', 400);
  }
}

function uploadRoot() {
  return path.resolve(process.cwd(), 'uploads');
}

function resolveUploadPath(segments: string[]) {
  segments.forEach(assertSafeSegment);
  const resolved = path.resolve(uploadRoot(), ...segments);

  if (!resolved.startsWith(uploadRoot())) {
    throw new AppError('Caminho de upload invalido', 400);
  }

  return resolved;
}

function decodeBase64Image(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/);

  if (!match) {
    throw new AppError('Formato de imagem invalido. Use JPG, PNG ou WEBP.', 422);
  }

  const mime = match[1];
  const extension = allowedMimeTypes[mime];
  const base64 = match[2].replace(/\s/g, '');
  const buffer = Buffer.from(base64, 'base64');

  if (buffer.length === 0) {
    throw new AppError('Imagem vazia ou invalida', 422);
  }

  if (buffer.length > maxImageBytes) {
    throw new AppError('Cada foto deve ter no maximo 5 MB', 422);
  }

  return { buffer, extension };
}

export async function saveBase64Image(dataUrl: string, segments: string[]) {
  const { buffer, extension } = decodeBase64Image(dataUrl);
  const dir = resolveUploadPath(segments);
  const filename = `${Date.now()}-${randomUUID()}.${extension}`;
  const filepath = path.join(dir, filename);

  await mkdir(dir, { recursive: true, mode: 0o750 });
  await writeFile(filepath, buffer, { mode: 0o640 });

  return {
    filename,
    publicPath: path.posix.join('/uploads', ...segments, filename)
  };
}

export async function removeUploadDirectory(segments: string[]) {
  await rm(resolveUploadPath(segments), { recursive: true, force: true });
}

export async function removeUploadFile(publicPath: string) {
  if (!publicPath.startsWith('/uploads/')) {
    throw new AppError('Caminho de upload invalido', 400);
  }

  const relative = publicPath.replace(/^\/uploads\//, '');
  const segments = relative.split('/');
  const filename = segments.pop();

  if (!filename) {
    throw new AppError('Caminho de upload invalido', 400);
  }

  segments.forEach(assertSafeSegment);
  await rm(path.join(resolveUploadPath(segments), filename), { force: true });
}
