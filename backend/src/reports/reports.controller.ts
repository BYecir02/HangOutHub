import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { UpdateReportActionDto } from './dto/update-report-action.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
  };
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private ensureAdmin(req: AuthenticatedRequest) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Acces reserve aux administrateurs.');
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() body: CreateReportDto) {
    return this.reportsService.create(req.user.userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('admin')
  findAll(@Request() req: AuthenticatedRequest) {
    this.ensureAdmin(req);
    return this.reportsService.findAllAdmin();
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateReportStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.ensureAdmin(req);
    return this.reportsService.updateStatus(id, body.status);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/action')
  applyAction(
    @Param('id') id: string,
    @Body() body: UpdateReportActionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.ensureAdmin(req);
    return this.reportsService.applyAction(
      id,
      body.action,
      req.user.userId,
      body.note,
    );
  }
}
