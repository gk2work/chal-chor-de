const logger = require("../utils/logger");
const ContextService = require("./contextService");

class NotificationService {
  /**
   * Send push notification for new message
   */
  static async sendMessageNotification(message, thread, recipients) {
    try {
      const notificationText = ContextService.generateNotificationText(
        message,
        thread
      );

      // In a real implementation, this would integrate with:
      // - Firebase Cloud Messaging for mobile push notifications
      // - Email service for email notifications
      // - WebSocket for in-app notifications

      logger.info("Sending message notification", {
        messageId: message.message_id,
        threadId: thread.thread_id,
        recipientCount: recipients.length,
        notificationText,
      });

      // Mock notification sending
      const notifications = recipients.map((recipient) => ({
        user_id: recipient.user_id,
        type: "message",
        title: `New message in ${thread.title}`,
        body: notificationText,
        data: {
          thread_id: thread.thread_id,
          message_id: message.message_id,
          transaction_type: thread.transaction_type,
          transaction_id: thread.transaction_id,
        },
        sent_at: new Date(),
      }));

      // Log notifications for development
      notifications.forEach((notification) => {
        logger.info("Push notification sent", notification);
      });

      return notifications;
    } catch (error) {
      logger.error("Error sending message notification:", error);
      throw error;
    }
  }

  /**
   * Send notification for thread events
   */
  static async sendThreadNotification(thread, action, userData, recipients) {
    try {
      const systemMessage = ContextService.generateSystemMessage(
        action,
        thread,
        userData
      );

      const notifications = recipients.map((recipient) => ({
        user_id: recipient.user_id,
        type: "thread_event",
        title: `${thread.title}`,
        body: systemMessage.text,
        data: {
          thread_id: thread.thread_id,
          action,
          transaction_type: thread.transaction_type,
          transaction_id: thread.transaction_id,
          ...systemMessage.data,
        },
        sent_at: new Date(),
      }));

      logger.info("Sending thread event notifications", {
        threadId: thread.thread_id,
        action,
        recipientCount: recipients.length,
      });

      // Log notifications for development
      notifications.forEach((notification) => {
        logger.info("Thread notification sent", notification);
      });

      return notifications;
    } catch (error) {
      logger.error("Error sending thread notification:", error);
      throw error;
    }
  }

  /**
   * Send mention notification
   */
  static async sendMentionNotification(message, thread, mentionedUsers) {
    try {
      const notifications = mentionedUsers.map((user) => ({
        user_id: user.user_id,
        type: "mention",
        title: `You were mentioned in ${thread.title}`,
        body: `${message.sender.name}: ${message.content.text?.substring(0, 100)}`,
        data: {
          thread_id: thread.thread_id,
          message_id: message.message_id,
          mentioned_by: message.sender.user_id,
          transaction_type: thread.transaction_type,
        },
        sent_at: new Date(),
      }));

      logger.info("Sending mention notifications", {
        messageId: message.message_id,
        threadId: thread.thread_id,
        mentionCount: mentionedUsers.length,
      });

      // Log notifications for development
      notifications.forEach((notification) => {
        logger.info("Mention notification sent", notification);
      });

      return notifications;
    } catch (error) {
      logger.error("Error sending mention notification:", error);
      throw error;
    }
  }

  /**
   * Send reminder notifications
   */
  static async sendReminderNotification(
    thread,
    reminderType,
    reminderData,
    recipients
  ) {
    try {
      let title, body;

      switch (reminderType) {
        case "carpool_departure":
          title = "Carpool Reminder";
          body = `Your carpool from ${reminderData.origin} to ${reminderData.destination} departs in ${reminderData.time_until}`;
          break;

        case "book_due":
          title = "Book Return Reminder";
          body = `"${reminderData.book_title}" is due for return in ${reminderData.days_until} days`;
          break;

        case "bike_return":
          title = "Bike Return Reminder";
          body = `Please return the ${reminderData.bike_model} by ${reminderData.due_time}`;
          break;

        default:
          title = "Reminder";
          body = reminderData.message || "You have a pending reminder";
      }

      const notifications = recipients.map((recipient) => ({
        user_id: recipient.user_id,
        type: "reminder",
        title,
        body,
        data: {
          thread_id: thread.thread_id,
          reminder_type: reminderType,
          transaction_type: thread.transaction_type,
          transaction_id: thread.transaction_id,
          ...reminderData,
        },
        sent_at: new Date(),
      }));

      logger.info("Sending reminder notifications", {
        threadId: thread.thread_id,
        reminderType,
        recipientCount: recipients.length,
      });

      // Log notifications for development
      notifications.forEach((notification) => {
        logger.info("Reminder notification sent", notification);
      });

      return notifications;
    } catch (error) {
      logger.error("Error sending reminder notification:", error);
      throw error;
    }
  }

  /**
   * Get notification preferences for users
   */
  static async getNotificationPreferences(userIds) {
    try {
      // In a real implementation, this would fetch from user preferences
      // For now, return default preferences
      const preferences = userIds.map((userId) => ({
        user_id: userId,
        push_notifications: true,
        email_notifications: true,
        in_app_notifications: true,
        mention_notifications: true,
        thread_notifications: true,
        reminder_notifications: true,
        quiet_hours: {
          enabled: true,
          start: "22:00",
          end: "08:00",
        },
      }));

      return preferences;
    } catch (error) {
      logger.error("Error getting notification preferences:", error);
      return [];
    }
  }

  /**
   * Check if user should receive notification based on preferences and quiet hours
   */
  static shouldSendNotification(
    userPreferences,
    notificationType,
    currentTime = new Date()
  ) {
    try {
      if (!userPreferences) return false;

      // Check notification type preference
      switch (notificationType) {
        case "message":
          if (!userPreferences.push_notifications) return false;
          break;
        case "mention":
          if (!userPreferences.mention_notifications) return false;
          break;
        case "thread_event":
          if (!userPreferences.thread_notifications) return false;
          break;
        case "reminder":
          if (!userPreferences.reminder_notifications) return false;
          break;
        default:
          return true;
      }

      // Check quiet hours
      if (userPreferences.quiet_hours?.enabled) {
        const currentHour = currentTime.getHours();
        const currentMinute = currentTime.getMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;

        const [startHour, startMinute] = userPreferences.quiet_hours.start
          .split(":")
          .map(Number);
        const [endHour, endMinute] = userPreferences.quiet_hours.end
          .split(":")
          .map(Number);

        const startTimeMinutes = startHour * 60 + startMinute;
        const endTimeMinutes = endHour * 60 + endMinute;

        // Handle quiet hours that span midnight
        if (startTimeMinutes > endTimeMinutes) {
          if (
            currentTimeMinutes >= startTimeMinutes ||
            currentTimeMinutes <= endTimeMinutes
          ) {
            return false; // In quiet hours
          }
        } else {
          if (
            currentTimeMinutes >= startTimeMinutes &&
            currentTimeMinutes <= endTimeMinutes
          ) {
            return false; // In quiet hours
          }
        }
      }

      return true;
    } catch (error) {
      logger.error("Error checking notification preferences:", error);
      return true; // Default to sending notification
    }
  }

  /**
   * Batch send notifications with preference filtering
   */
  static async batchSendNotifications(notifications, notificationType) {
    try {
      const userIds = [...new Set(notifications.map((n) => n.user_id))];
      const preferences = await this.getNotificationPreferences(userIds);

      const filteredNotifications = notifications.filter((notification) => {
        const userPrefs = preferences.find(
          (p) => p.user_id === notification.user_id
        );
        return this.shouldSendNotification(userPrefs, notificationType);
      });

      logger.info("Batch sending notifications", {
        totalNotifications: notifications.length,
        filteredNotifications: filteredNotifications.length,
        notificationType,
      });

      // In a real implementation, this would send to actual notification services
      filteredNotifications.forEach((notification) => {
        logger.info("Notification delivered", {
          userId: notification.user_id,
          type: notification.type,
          title: notification.title,
        });
      });

      return {
        sent: filteredNotifications.length,
        filtered: notifications.length - filteredNotifications.length,
        total: notifications.length,
      };
    } catch (error) {
      logger.error("Error batch sending notifications:", error);
      throw error;
    }
  }
}

module.exports = NotificationService;
