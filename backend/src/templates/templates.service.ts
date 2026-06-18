import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

interface EditableArea {
  id: string;
  label: string;
  defaultText: string;
  x?: number;
  y?: number;
  fontSize?: number;
  fontFamily?: string;
  maxLength?: number;
}

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPublic(categoryId?: string, productId?: string) {
    return this.prisma.template.findMany({
      where: {
        isActive: true,
        ...(categoryId && { categoryId }),
        ...(productId && { products: { some: { productId } } }),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        categoryId: true,
        editableAreas: true,
        thumbnailUrl: true,
        sortOrder: true,
        products: {
          select: { productId: true },
        },
      },
    });
  }

  async findOnePublic(id: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, isActive: true },
      include: {
        products: { select: { productId: true } },
      },
    });
    if (!template) throw new NotFoundException('Plantilla no encontrada');
    return template;
  }

  async findAllAdmin() {
    return this.prisma.template.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        category: { select: { id: true, name: true, slug: true } },
        products: {
          select: {
            productId: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });
  }

  async findOneAdmin(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        products: {
          select: {
            productId: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });
    if (!template) throw new NotFoundException('Plantilla no encontrada');
    return template;
  }

  async create(dto: CreateTemplateDto, svgContent: string) {
    if (!svgContent || svgContent.trim().length < 50) {
      throw new BadRequestException('El contenido SVG es inválido o está vacío');
    }

    const parsedEditableAreas =
      typeof dto.editableAreas === 'string'
        ? JSON.parse(dto.editableAreas)
        : dto.editableAreas;

    const editableAreas = parsedEditableAreas ?? this.extractEditableAreas(svgContent);

    return this.prisma.template.create({
      data: {
        name: dto.name,
        categoryId: dto.categoryId,
        svgContent,
        editableAreas: editableAreas as any,
        thumbnailUrl: dto.thumbnailUrl,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
        products: dto.productIds?.length
          ? { create: dto.productIds.map((productId) => ({ productId })) }
          : undefined,
      },
      include: { products: { select: { productId: true } } },
    });
  }

  async update(id: string, dto: UpdateTemplateDto, svgContent?: string) {
    const existing = await this.findOneAdmin(id);

    const data: any = {
      name: dto.name,
      categoryId: dto.categoryId,
      thumbnailUrl: dto.thumbnailUrl,
      isActive: dto.isActive,
      sortOrder: dto.sortOrder,
    };

    if (svgContent !== undefined) {
      if (svgContent.trim().length < 50) {
        throw new BadRequestException('El contenido SVG es inválido o está vacío');
      }
      data.svgContent = svgContent;
      if (dto.editableAreas === undefined) {
        data.editableAreas = this.extractEditableAreas(svgContent);
      }
    }

    if (dto.editableAreas !== undefined) {
      data.editableAreas =
        typeof dto.editableAreas === 'string'
          ? JSON.parse(dto.editableAreas)
          : dto.editableAreas;
    }

    // Reconectar productos si vienen en el DTO
    if (dto.productIds !== undefined) {
      data.products = {
        deleteMany: {},
        create: dto.productIds.map((productId) => ({ productId })),
      };
    }

    return this.prisma.template.update({
      where: { id },
      data,
      include: { products: { select: { productId: true } } },
    });
  }

  async remove(id: string) {
    await this.findOneAdmin(id);
    return this.prisma.template.delete({ where: { id } });
  }

  /**
   * Extrae áreas editables de un SVG buscando elementos <text> con data-editable="true".
   */
  extractEditableAreas(svgContent: string): EditableArea[] {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        parseAttributeValue: false,
        preserveOrder: true,
      });

      const parsed = parser.parse(svgContent);
      const areas: EditableArea[] = [];
      this.walkAndExtract(parsed, areas);
      return areas;
    } catch (e) {
      return [];
    }
  }

  /**
   * Reemplaza los textos editables en el SVG por los valores enviados por el cliente.
   */
  applyTemplateFields(svgContent: string, fields: Record<string, string>): string {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: false,
      preserveOrder: true,
    });

    const parsed = parser.parse(svgContent);
    this.walkAndReplace(parsed, fields);

    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      preserveOrder: true,
      format: false,
    });

    return builder.build(parsed);
  }

  private walkAndExtract(node: any, areas: EditableArea[]) {
    if (Array.isArray(node)) {
      node.forEach((child) => this.walkAndExtract(child, areas));
      return;
    }

    if (typeof node !== 'object' || node === null) return;

    if (node['data-editable'] === 'true' || node['data-editable'] === true) {
      const field = node['data-field'] || `field${areas.length + 1}`;
      const label = node['data-label'] || `Texto ${areas.length + 1}`;
      const text = this.getTextContent(node) || '';

      areas.push({
        id: field,
        label,
        defaultText: text,
        x: this.parseNumber(node.x ?? node['data-x']),
        y: this.parseNumber(node.y ?? node['data-y']),
        fontSize: this.parseNumber(node['font-size']),
        fontFamily: node['font-family'],
        maxLength: this.parseNumber(node['data-maxlength']),
      });
    }

    for (const key of Object.keys(node)) {
      if (key === ':@') continue;
      this.walkAndExtract(node[key], areas);
    }
  }

  private walkAndReplace(node: any, fields: Record<string, string>) {
    if (Array.isArray(node)) {
      node.forEach((child) => this.walkAndReplace(child, fields));
      return;
    }

    if (typeof node !== 'object' || node === null) return;

    if (node['data-editable'] === 'true' || node['data-editable'] === true) {
      const field = node['data-field'];
      if (field && fields[field] !== undefined) {
        this.setTextContent(node, fields[field]);
      }
    }

    for (const key of Object.keys(node)) {
      if (key === ':@') continue;
      this.walkAndReplace(node[key], fields);
    }
  }

  private getTextContent(node: any): string {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map((n) => this.getTextContent(n)).join('');
    if (typeof node !== 'object') return '';

    let text = '';
    for (const key of Object.keys(node)) {
      if (key === ':@') continue;
      text += this.getTextContent(node[key]);
    }
    return text;
  }

  private setTextContent(node: any, value: string) {
    if (Array.isArray(node['#text'])) {
      node['#text'] = [value];
    } else if (node['#text'] !== undefined) {
      node['#text'] = value;
    } else {
      const keys = Object.keys(node).filter((k) => k !== ':@');
      for (const key of keys) {
        if (typeof node[key] === 'string') {
          node[key] = value;
          return;
        }
        if (Array.isArray(node[key]) && node[key].every((i: any) => typeof i === 'string')) {
          node[key] = [value];
          return;
        }
      }
    }
  }

  private parseNumber(value: any): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const n = parseFloat(String(value));
    return isNaN(n) ? undefined : n;
  }
}
