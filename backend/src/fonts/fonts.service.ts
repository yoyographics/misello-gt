import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFontDto } from './dto/create-font.dto';
import { UpdateFontDto } from './dto/update-font.dto';
import { readFileSync } from 'fs';
import * as opentype from 'opentype.js';

@Injectable()
export class FontsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPublic() {
    return this.prisma.font.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.font.findMany({ orderBy: { name: 'asc' } });
  }

  async findOnePublic(id: string) {
    const font = await this.prisma.font.findFirst({
      where: { id, isActive: true },
    });
    if (!font) throw new NotFoundException('Tipografía no encontrada');
    return font;
  }

  async findOneAdmin(id: string) {
    const font = await this.prisma.font.findUnique({ where: { id } });
    if (!font) throw new NotFoundException('Tipografía no encontrada');
    return font;
  }

  private extractFontName(buffer: Buffer, fallback: string): string {
    try {
      const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
      const names = font.names;

      // Intentar obtener fontFamily o fullName en cualquier idioma
      const candidates = [
        names.fontFamily?.en,
        names.fontFamily ? Object.values(names.fontFamily)[0] : undefined,
        names.fullName?.en,
        names.fullName ? Object.values(names.fullName)[0] : undefined,
      ];

      const extracted = candidates.find((n) => typeof n === 'string' && n.trim().length > 0);
      if (extracted) {
        return extracted.trim();
      }
    } catch {
      // Si opentype falla al parsear, usar fallback
    }
    return fallback;
  }

  async create(dto: CreateFontDto, fileName: string, originalName?: string) {
    // Leer archivo y convertir a base64 para persistencia en BD
    const filePath = `./uploads/fonts/${fileName}`;
    let fileData: string | undefined;
    let buffer: Buffer | undefined;
    try {
      buffer = readFileSync(filePath);
      fileData = buffer.toString('base64');
    } catch {
      // Si no se puede leer, continuar sin fileData
      fileData = undefined;
    }

    // Extraer nombre real de la tipografia desde los metadatos del archivo
    const fallbackName = originalName || 'Sin nombre';
    const extractedName = buffer ? this.extractFontName(buffer, fallbackName) : fallbackName;

    // Si el usuario no puso nombre manual, usar el extraido del archivo
    const name = dto.name || extractedName;

    return this.prisma.font.create({
      data: {
        name,
        fileName,
        originalName: originalName || undefined,
        fileData,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateFontDto) {
    await this.findOneAdmin(id);
    return this.prisma.font.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOneAdmin(id);
    return this.prisma.font.delete({ where: { id } });
  }
}
