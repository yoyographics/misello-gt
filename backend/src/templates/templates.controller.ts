import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { readFileSync, unlinkSync } from 'fs';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';

const ALLOWED_EXTS = ['.svg'];

@ApiTags('Plantillas de diseño')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAllPublic(
    @Query('categoryId') categoryId?: string,
    @Query('productId') productId?: string,
  ) {
    return this.templatesService.findAllPublic(categoryId, productId);
  }

  @Get(':id')
  findOnePublic(@Param('id') id: string) {
    return this.templatesService.findOnePublic(id);
  }

  @Get('admin/all')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  findAllAdmin() {
    return this.templatesService.findAllAdmin();
  }

  @Get('admin/:id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  findOneAdmin(@Param('id') id: string) {
    return this.templatesService.findOneAdmin(id);
  }

  @Post('admin')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/templates',
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTS.includes(ext)) {
          return cb(new BadRequestException('Solo se permiten archivos .svg'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    }),
  )
  async create(
    @Body() dto: CreateTemplateDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('El archivo SVG es obligatorio');
    }

    const svgContent = readFileSync(file.path, 'utf-8');
    try {
      unlinkSync(file.path);
    } catch {
      // ignore cleanup errors
    }

    return this.templatesService.create(dto, svgContent);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/templates',
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file) return cb(null, true);
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTS.includes(ext)) {
          return cb(new BadRequestException('Solo se permiten archivos .svg'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let svgContent: string | undefined;
    if (file) {
      svgContent = readFileSync(file.path, 'utf-8');
      try {
        unlinkSync(file.path);
      } catch {
        // ignore cleanup errors
      }
    }

    return this.templatesService.update(id, dto, svgContent);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }
}
