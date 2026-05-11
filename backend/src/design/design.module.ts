import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DesignController } from './design.controller';
import { DesignService } from './design.service';
import { ClaudeDesignService } from './services/claude-design.service';
import { SvgRendererService } from './services/svg-renderer.service';
import { TechValidatorService } from './services/tech-validator.service';

/**
 * Modulo 3 — Design Assistant.
 * Integra Claude API para generar parametros de diseno,
 * renderer determinista SVG/PNG, y validador tecnico.
 */
@Module({
  imports: [JwtModule],
  controllers: [DesignController],
  providers: [DesignService, ClaudeDesignService, SvgRendererService, TechValidatorService],
  exports: [DesignService, SvgRendererService, TechValidatorService],
})
export class DesignModule {}
