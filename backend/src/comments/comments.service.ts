import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  private readonly userSelect = {
    id: true,
    username: true,
    displayName: true,
    avatarUrl: true,
  };

  async findOne(id: string) {
    const comment = await this.prisma.postComment.findUnique({
      where: { id },
      include: { User: { select: this.userSelect } },
    });

    if (!comment) {
      throw new NotFoundException('Commentaire introuvable');
    }

    return comment;
  }

  async update(id: string, userId: string, updateCommentDto: UpdateCommentDto) {
    const comment = await this.prisma.postComment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Commentaire introuvable');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException(
        "Vous n'etes pas autorise a modifier ce commentaire",
      );
    }

    return this.prisma.postComment.update({
      where: { id },
      data: { content: updateCommentDto.content },
      include: { User: { select: this.userSelect } },
    });
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.postComment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Commentaire introuvable');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException(
        "Vous n'etes pas autorise a supprimer ce commentaire",
      );
    }

    return this.prisma.postComment.delete({ where: { id } });
  }
}
