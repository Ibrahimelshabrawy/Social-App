import {Types} from "mongoose";
import NotificationModel, {
  INotification,
} from "../../DB/models/notification.model";
import BaseRepository from "./base.repository";
import {NotificationTypeEnum} from "../../common/enum/notification.enum";
import redisService from "../../common/utils/services/redis.service";
import notificationService from "../../common/utils/services/notification.service";

class NotificationRepository extends BaseRepository<INotification> {
  constructor() {
    super(NotificationModel);
  }

  sendNotificationRequest = async ({
    senderId,
    receiverId,
    title,
    body,
    type,
    postId,
    commentId,
  }: {
    senderId: Types.ObjectId;
    receiverId: Types.ObjectId;
    title: string;
    body: string;
    type: NotificationTypeEnum;
    postId?: Types.ObjectId;
    commentId?: Types.ObjectId;
  }) => {
    // Create Notification
    await this.model.create({
      senderId,
      receiverId,
      title,
      body,
      type,
      postId,
      commentId,
    } as Partial<INotification>);
    const FCMTokens = await redisService.getFCMs(receiverId);

    if (FCMTokens.length) {
      await notificationService.sendNotifications({
        tokens: FCMTokens,

        data: {
          title,
          body,
        },
      });
    }
  };
}

export default new NotificationRepository();
