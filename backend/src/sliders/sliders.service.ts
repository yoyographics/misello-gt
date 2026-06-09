import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSliderDto } from './dto/create-slider.dto';
import { UpdateSliderDto } from './dto/update-slider.dto';

@Injectable()
export class SlidersService {
  constructor(private prisma: PrismaService) {}

  findAllPublic() {
    return this.prisma.sliderImage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findAllAdmin() {
    return this.prisma.sliderImage.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  create(data: CreateSliderDto) {
    return this.prisma.sliderImage.create({ data });
  }

  update(id: string, data: UpdateSliderDto) {
    return this.prisma.sliderImage.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.sliderImage.delete({ where: { id } });
  }

  async seedDefaults() {
    const defaults = [
      {
        title: 'Sellos personalizados sin salir de casa',
        subtitle: 'Diseña tu sello en minutos y recíbelo en cualquier departamento de Guatemala.',
        imageUrl: '',
        gradient: 'from-[#1B2A6B] to-[#0f1a4a]',
        animation: 'fade-up',
        buttonText: 'Crear mi sello',
        buttonType: 'URL' as const,
        buttonUrl: '/design',
        sortOrder: 0,
        isActive: true,
      },
      {
        title: 'Calidad profesional garantizada',
        subtitle: 'Fabricados con tecnología láser de alta precisión.',
        imageUrl: '',
        gradient: 'from-[#1B2A6B] to-[#16245c]',
        animation: 'fade-left',
        buttonText: 'Ver sellos automáticos',
        buttonType: 'URL' as const,
        buttonUrl: '/store',
        sortOrder: 1,
        isActive: true,
      },
      {
        title: 'Fabricación rápida',
        subtitle: 'Producción y envío en tiempo récord.',
        imageUrl: '',
        gradient: 'from-[#1B2A6B] to-[#243885]',
        animation: 'fade-right',
        buttonText: 'Ver catálogo',
        buttonType: 'URL' as const,
        buttonUrl: '/store',
        sortOrder: 2,
        isActive: true,
      },
      {
        title: 'Envíos a toda Guatemala',
        subtitle: 'Recibe tu pedido en 3 a 4 días hábiles.',
        imageUrl: '',
        gradient: 'from-[#1B2A6B] to-[#122052]',
        animation: 'zoom-in',
        buttonText: 'Hacer pedido',
        buttonType: 'URL' as const,
        buttonUrl: '/design',
        sortOrder: 3,
        isActive: true,
      },
    ];

    // Solo inserta si no hay sliders existentes
    const count = await this.prisma.sliderImage.count();
    if (count > 0) {
      return { seeded: false, message: 'Ya existen sliders en la base de datos' };
    }

    await this.prisma.sliderImage.createMany({ data: defaults });
    return { seeded: true, count: defaults.length };
  }
}
