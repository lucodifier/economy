import { BadRequestException, Controller, Get, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { GoogleAuthGuard } from '../../auth/google-auth.guard';
import { CurrentUser, AuthUser } from '../../auth/user.decorator';
import { ImportExportService } from './import-export.service';

@UseGuards(GoogleAuthGuard)
@Controller()
export class ImportExportController {
  constructor(private readonly service: ImportExportService) {}

  @Get('/export')
  async export(
    @CurrentUser() user: AuthUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('accountId') accountId: string | undefined,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    const f = (format || 'csv').toLowerCase();
    if (!from || !to) throw new BadRequestException('from and to are required');
    if (f !== 'csv' && f !== 'xlsx') throw new BadRequestException('format must be csv or xlsx');

    const out = await this.service.export(user.id, { from, to, accountId, format: f });
    res.setHeader('Content-Type', out.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
    res.send(out.buffer);
  }

  @Post('/import/preview')
  @UseInterceptors(FileInterceptor('file'))
  async importPreview(
    @CurrentUser() user: AuthUser,
    @Query('accountId') accountId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!accountId) throw new BadRequestException('accountId is required');
    if (!file?.buffer) throw new BadRequestException('file is required');

    const name = String(file.originalname || '').toLowerCase();
    if (name.endsWith('.csv')) {
      return this.service.previewCSV(user.id, accountId, file.buffer);
    }

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return this.service.previewExcel(user.id, accountId, file.buffer);
    }

    throw new BadRequestException('Unsupported file type (use CSV/XLS/XLSX)');
  }

  @Post('/import')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @CurrentUser() user: AuthUser,
    @Query('accountId') accountId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!accountId) throw new BadRequestException('accountId is required');
    if (!file?.buffer) throw new BadRequestException('file is required');

    const name = String(file.originalname || '').toLowerCase();
    if (name.endsWith('.csv')) {
      return this.service.importCSV(user.id, accountId, file.buffer);
    }

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return this.service.importExcel(user.id, accountId, file.buffer);
    }

    throw new BadRequestException('Unsupported file type (use CSV/XLS/XLSX)');
  }

  @Get('/import/template')
  async template(@Query('format') format: string | undefined, @Res() res: Response) {
    const f = (format || 'csv').toLowerCase();
    if (f !== 'csv' && f !== 'xlsx') throw new BadRequestException('format must be csv or xlsx');

    const out = await this.service.template(f);
    res.setHeader('Content-Type', out.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
    res.send(out.buffer);
  }
}
