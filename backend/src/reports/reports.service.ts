import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async create(reporterId: string, dto: CreateReportDto) {
    const targetType = dto.targetType?.toUpperCase();
    const reason = dto.reason?.trim();

    if (!reason) {
      throw new BadRequestException('La raison est obligatoire.');
    }

    return this.prisma.report.create({
      data: {
        reporterId,
        targetId: dto.targetId,
        targetType,
        reason,
        status: 'PENDING',
      },
    });
  }

  async findAllAdmin() {
    return this.prisma.report.findMany({
      include: {
        User: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.report.update({
      where: { id },
      data: {
        status: status.toUpperCase(),
      },
    });
  }

  async applyAction(
    reportId: string,
    action: string,
    moderatorId: string,
    note?: string,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Signalement introuvable.');
    }

    const normalizedAction = action.toUpperCase();
    const targetType = report.targetType?.toUpperCase();

    if (normalizedAction === 'DELETE_CONTENT') {
      if (targetType === 'POST') {
        await this.prisma.post.delete({ where: { id: report.targetId } });
      } else if (targetType === 'COMMENT') {
        await this.prisma.postComment.delete({
          where: { id: report.targetId },
        });
      } else if (targetType === 'REVIEW') {
        await this.prisma.review.delete({ where: { id: report.targetId } });
      } else {
        throw new BadRequestException('Suppression non supportee pour ce type.');
      }
    }

    if (normalizedAction === 'SUSPEND_USER') {
      if (targetType !== 'USER') {
        throw new BadRequestException('Action reservee aux utilisateurs.');
      }
      await this.prisma.user.update({
        where: { id: report.targetId },
        data: { isSuspended: true },
      });
    }

    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'RESOLVED',
        actionTaken: normalizedAction,
        moderatorNote: note?.trim() || null,
        resolvedByUserId: moderatorId,
        resolvedAt: new Date(),
      },
    });
  }
}
