import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { NotificationResponseDto, NotificationCountDto } from './dto/notification.dto';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Get my notifications
   */
  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [NotificationResponseDto] })
  async getMyNotifications(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ): Promise<NotificationResponseDto[]> {
    return this.notificationService.getByUser(
      userId,
      limit ? parseInt(limit, 10) : 50,
      unreadOnly === 'true',
    );
  }

  /**
   * Get notification count
   */
  @Get('count')
  @ApiOperation({ summary: 'Get notification count' })
  @ApiResponse({ status: 200, type: NotificationCountDto })
  async getCount(@CurrentUser('id') userId: string): Promise<NotificationCountDto> {
    return this.notificationService.getCount(userId);
  }

  /**
   * Mark notification as read
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 204, description: 'Notification marked as read' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.notificationService.markAsRead(id, userId);
  }

  /**
   * Mark all notifications as read
   */
  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'Count of notifications marked as read' })
  async markAllAsRead(@CurrentUser('id') userId: string): Promise<{ count: number }> {
    const count = await this.notificationService.markAllAsRead(userId);
    return { count };
  }
}