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

  async findAllPublic(categoryId?: string, shape?: string, widthMm?: number, heightMm?: number) {
    return this.prisma.template.findMany({
      where: {
        isActive: true,
        ...(categoryId && { categoryId }),
        ...(shape && { productShape: shape }),
        ...(widthMm !== undefined && { widthMm }),
        ...(heightMm !== undefined && { heightMm }),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        categoryId: true,
        productShape: true,
        widthMm: true,
        heightMm: true,
        editableAreas: true,
        thumbnailUrl: true,
        sortOrder: true,
      },
    });
  }

  async findOnePublic(id: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, isActive: true },
    });
    if (!template) throw new NotFoundException('Plantilla no encontrada');
    return template;
  }

  async findAllAdmin() {
    return this.prisma.template.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findOneAdmin(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
    if (!template) throw new NotFoundException('Plantilla no encontrada');
    return template;
  }

  async create(dto: CreateTemplateDto, svgContent: string) {
    if (!svgContent || svgContent.trim().length < 50) {
      throw new BadRequestException('El contenido SVG es inválido o está vacío');
    }

    const editableAreas = dto.editableAreas ?? this.extractEditableAreas(svgContent);

    return this.prisma.template.create({
      data: {
        ...dto,
        svgContent,
        editableAreas: editableAreas as any,
      },
    });
  }

  async update(id: string, dto: UpdateTemplateDto, svgContent?: string) {
    const existing = await this.findOneAdmin(id);

    const data: any = { ...dto };
    if (svgContent !== undefined) {
      if (svgContent.trim().length < 50) {
        throw new BadRequestException('El contenido SVG es inválido o está vacío');
      }
      data.svgContent = svgContent;
      if (dto.editableAreas === undefined) {
        data.editableAreas = this.extractEditableAreas(svgContent);
      }
    }

    return this.prisma.template.update({
      where: { id },
      data,
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
    // fast-xml-parser con preserveOrder guarda el contenido como array mezclada.
    // Simplificación: reemplazamos todas las entradas de texto plano por el valor.
    if (Array.isArray(node['#text'])) {
      node['#text'] = [value];
    } else if (node['#text'] !== undefined) {
      node['#text'] = value;
    } else {
      // Si el nodo tiene hijos, intentamos dejar atributos y reemplazar contenido
      const keys = Object.keys(node).filter((k) => k !== ':@');
      for (const key of keys) {
        if (typeof node[key] === 'string') {
          node[key] = value;
          return;
        }
        if (Array.isArray(node[key]) && node[key].every((i) => typeof i === 'string')) {
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
