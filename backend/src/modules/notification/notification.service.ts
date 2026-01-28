import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { NotificationResponseDto, NotificationCountDto } from './dto/notification.dto';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a notification
   */
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    referenceId?: string,
  ): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        referenceId,
      },
    });
  }

  /**
   * Create notifications for multiple users
   */
  async createForMultipleUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    referenceId?: string,
  ): Promise<void> {
    await this.prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type,
        title,
        message,
        referenceId,
      })),
    });
  }

  /**
   * Get notifications for a user
   */
  async getByUser(
    userId: string,
    limit: number = 50,
    unreadOnly: boolean = false,
  ): Promise<NotificationResponseDto[]> {
    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return notifications.map(n => this.mapToResponse(n));
  }

  /**
   * Get notification count for a user
   */
  async getCount(userId: string): Promise<NotificationCountDto> {
    const [total, unread] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { total, unread };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return result.count;
  }

  /**
   * Get all admins for notification purposes
   */
  async getAdminUserIds(): Promise<string[]> {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });
    return admins.map(a => a.id);
  }

  /**
   * Map to response DTO
   */
  private mapToResponse(notification: any): NotificationResponseDto {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      referenceId: notification.referenceId,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };
  }
}