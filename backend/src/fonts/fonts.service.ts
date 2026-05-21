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

  private extractStrokeRatio(buffer: Buffer): number | undefined {
    try {
      const font = opentype.parse(
        buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      );

      // 1. Intentar usar usWeightClass de OS/2 (más confiable)
      const weightClass = (font as any).tables?.os2?.usWeightClass;
      if (typeof weightClass === 'number') {
        // Mapeo: 100-300 → light, 400 → normal, 500-600 → medium, 700+ → bold
        if (weightClass <= 300) return 0.06;
        if (weightClass <= 400) return 0.08;
        if (weightClass <= 600) return 0.10;
        return 0.14;
      }

      // 2. Fallback: medir bounding box de "H" vs advance width
      const fontSize = 1000;
      const pathH = font.getPath('H', 0, 0, fontSize);
      const bbox = pathH.getBoundingBox();
      const advance = font.getAdvanceWidth('H', fontSize);
      if (advance > 0) {
        const charWidth = bbox.x2 - bbox.x1;
        const weightProxy = charWidth / advance;
        // Mapeo empírico: light ~0.55, normal ~0.65, bold ~0.80
        if (weightProxy < 0.58) return 0.06;
        if (weightProxy < 0.68) return 0.08;
        if (weightProxy < 0.78) return 0.10;
        return 0.14;
      }
    } catch {
      // Si falla, no guardar strokeRatio
    }
    return undefined;
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

    // Extraer strokeRatio (grosor de trazo real) para validaciones técnicas
    const strokeRatio = buffer ? this.extractStrokeRatio(buffer) : undefined;

    // Si el usuario no puso nombre manual, usar el extraido del archivo
    const name = dto.name || extractedName;

    return this.prisma.font.create({
      data: {
        name,
        fileName,
        originalName: originalName || undefined,
        fileData,
        strokeRatio,
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

  async setDefault(id: string) {
    await this.findOneAdmin(id);
    // Transaction: unset all defaults, then set the selected one
    await this.prisma.$transaction([
      this.prisma.font.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.font.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);
    return this.prisma.font.findUnique({ where: { id } });
  }

  async remove(id: string) {
    await this.findOneAdmin(id);
    return this.prisma.font.delete({ where: { id } });
  }
}
