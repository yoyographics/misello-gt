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
}
