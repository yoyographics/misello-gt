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
  NotFoundException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, basename } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import type { Response } from 'express';
import { FontsService } from './fonts.service';
import { CreateFontDto } from './dto/create-font.dto';
import { CreateFontBase64Dto } from './dto/create-font-base64.dto';
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

  /**
   * Sirve el archivo de fuente directamente desde fileData (base64 en BD).
   * Endpoint público para que @font-face en CSS pueda cargar la fuente.
   */
  @Get(':id/file')
  async serveFontFile(@Param('id') id: string, @Res() res: Response) {
    const font = await this.fontsService.findOnePublic(id);
    if (!font.fileData || font.fileData.length < 100) {
      throw new NotFoundException('Archivo de fuente no disponible');
    }

    const isOtf = font.fileName?.toLowerCase().endsWith('.otf');
    const mime = isOtf ? 'font/otf' : 'font/ttf';
    const buffer = Buffer.from(font.fileData, 'base64');

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
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

  @Post('admin/:id/set-default')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  setDefault(@Param('id') id: string) {
    return this.fontsService.setDefault(id);
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

  /**
   * Upload alternativo que recibe el archivo como base64 en JSON.
   * Evita problemas con FormData/multer.
   */
  @Post('admin/base64')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  createBase64(@Body() dto: CreateFontBase64Dto) {
    const ext = extname(dto.originalName).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      throw new BadRequestException('Solo se permiten archivos .ttf y .otf');
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileName = `${uniqueSuffix}${ext}`;
    const uploadDir = './uploads/fonts';
    const uploadPath = `${uploadDir}/${fileName}`;

    mkdirSync(uploadDir, { recursive: true });
    writeFileSync(uploadPath, Buffer.from(dto.fileBase64, 'base64'));

    const createDto: CreateFontDto = {
      name: dto.name,
      isActive: dto.isActive,
    };

    return this.fontsService.create(createDto, fileName, dto.originalName);
  }

  /**
   * Endpoint de debug para ver estado de las fuentes en BD.
   */
  @Get('admin/debug')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  async debugFonts() {
    const fonts = await this.fontsService.findAllAdmin();
    return {
      total: fonts.length,
      withFileData: fonts.filter((f: any) => !!f.fileData && f.fileData.length > 100).length,
      withoutFileData: fonts.filter((f: any) => !f.fileData || f.fileData.length <= 100).length,
      fonts: fonts.map((f: any) => ({
        id: f.id,
        name: f.name,
        fileName: f.fileName,
        originalName: f.originalName,
        hasFileData: !!f.fileData && f.fileData.length > 100,
        fileDataLength: f.fileData?.length || 0,
        isActive: f.isActive,
      })),
    };
  }
}
