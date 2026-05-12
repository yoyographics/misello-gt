import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, basename } from 'path';
import { FontsService } from './fonts.service';
import { CreateFontDto } from './dto/create-font.dto';
import { UpdateFontDto } from './dto/update-font.dto';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';

const ALLOWED_MIME_TYPES = [
  'font/ttf',
  'font/otf',
  'application/x-font-ttf',
  'application/x-font-opentype',
  'application/octet-stream',
];

const ALLOWED_EXTS = ['.ttf', '.otf'];

@ApiTags('Catálogo — Tipografías')
@Controller('fonts')
export class FontsController {
  constructor(private readonly fontsService: FontsService) {}

  @Get()
  findAllPublic() {
    return this.fontsService.findAllPublic();
  }

  @Get(':id')
  findOnePublic(@Param('id') id: string) {
    return this.fontsService.findOnePublic(id);
  }

  @Get('admin/all')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  findAllAdmin() {
    return this.fontsService.findAllAdmin();
  }

  @Post('admin')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/fonts',
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTS.includes(ext)) {
          return cb(new BadRequestException('Solo se permiten archivos .ttf y .otf'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    }),
  )
  create(
    @Body() dto: CreateFontDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('El archivo de tipografía es obligatorio');
    }
    // Si no viene nombre, usar el nombre base del archivo original sin extension
    const originalName = basename(file.originalname, extname(file.originalname));
    if (!dto.name || dto.name.trim() === '') {
      (dto as any).name = originalName;
    }
    return this.fontsService.create(dto, file.filename, file.originalname);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: UpdateFontDto) {
    return this.fontsService.update(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.fontsService.remove(id);
  }

  /**
   * Endpoint de debug para verificar que el auth funciona en POST.
   * No requiere archivo, solo valida el JWT.
   */
  @Post('admin/test')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  testAuth(@Body() body: any) {
    return { ok: true, bodyKeys: Object.keys(body || {}) };
  }
}
