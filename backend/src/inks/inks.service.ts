import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateInkDto } from './dto/create-ink.dto';
import { UpdateInkDto } from './dto/update-ink.dto';

@Injectable()
export class InksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPublic() {
    return this.prisma.ink.findMany({
      where: { isActive: true },
      orderBy: { color: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.ink.findMany({ orderBy: { color: 'asc' } });
  }

  async findOnePublic(id: string) {
    const ink = await this.prisma.ink.findFirst({
      where: { id, isActive: true },
    });
    if (!ink) throw new NotFoundException('Tinta no encontrada');
    return ink;
  }

  async findOneAdmin(id: string) {
    const ink = await this.prisma.ink.findUnique({ where: { id } });
    if (!ink) throw new NotFoundException('Tinta no encontrada');
    return ink;
  }

  async create(dto: CreateInkDto) {
    return this.prisma.ink.create({ data: dto });
  }

  async update(id: string, dto: UpdateInkDto) {
    await this.findOneAdmin(id);
    return this.prisma.ink.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOneAdmin(id);
    return this.prisma.ink.update({ where: { id }, data: { isActive: false } });
  }
}
