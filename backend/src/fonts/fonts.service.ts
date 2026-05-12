import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFontDto } from './dto/create-font.dto';
import { UpdateFontDto } from './dto/update-font.dto';
import { readFileSync } from 'fs';

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

  async create(dto: CreateFontDto, fileName: string, originalName?: string) {
    // Leer archivo y convertir a base64 para persistencia en BD
    const filePath = `./uploads/fonts/${fileName}`;
    let fileData: string | undefined;
    try {
      const buffer = readFileSync(filePath);
      fileData = buffer.toString('base64');
    } catch {
      // Si no se puede leer, continuar sin fileData
      fileData = undefined;
    }

    const name = dto.name || originalName || 'Sin nombre';

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
