const ChatThread = require("../models/ChatThread");
const logger = require("../utils/logger");

class ContextService {
  /**
   * Create context-aware chat thread for different transaction types
   */
  static async createContextualThread(
    transactionType,
    transactionId,
    transactionData,
    creatorInfo
  ) {
    try {
      let title, description, metadata;

      switch (transactionType) {
        case "carpool":
          title = `Carpool: ${transactionData.origin} → ${transactionData.destination}`;
          description = `Discussion for carpool on ${transactionData.date} at ${transactionData.departure_time}`;
          metadata = {
            carpool: {
              trip_id: transactionId,
              origin: transactionData.origin,
              destination: transactionData.destination,
              date: transactionData.date,
              departure_time: transactionData.departure_time,
              driver_name: transactionData.driver_name,
              available_seats: transactionData.available_seats,
            },
          };
          break;

        case "book_sharing":
          title = `Book: ${transactionData.title}`;
          description = `Discussion about "${transactionData.title}" by ${transactionData.author}`;
          metadata = {
            book: {
              book_id: transactionId,
              title: transactionData.title,
              author: transactionData.author,
              isbn: transactionData.isbn,
              owner_name: transactionData.owner_name,
              condition: transactionData.condition,
            },
          };
          break;

        case "bike_sharing":
          title = `Bike: ${transactionData.model}`;
          description = `Discussion about ${transactionData.model} bike sharing`;
          metadata = {
            bike: {
              bike_id: transactionId,
              model: transactionData.model,
              location: transactionData.location,
              owner_name: transactionData.owner_name,
              condition: transactionData.condition,
            },
          };
          break;

        case "general":
          title = transactionData.title || "General Discussion";
          description =
            transactionData.description || "General office discussion";
          metadata = transactionData.metadata || {};
          break;

        default:
          throw new Error(`Unsupported transaction type: ${transactionType}`);
      }

      return {
        transaction_type: transactionType,
        transaction_id: transactionId,
        title,
        description,
        metadata,
        participants: [
          {
            user_id: creatorInfo.user_id,
            name: creatorInfo.name,
            role: "owner",
          },
        ],
      };
    } catch (error) {
      logger.error("Error creating contextual thread:", error);
      throw error;
    }
  }

  /**
   * Generate context-aware system messages
   */
  static generateSystemMessage(action, context, userData = {}) {
    const messages = {
      thread_created: {
        text: `${userData.creator || "Someone"} created this ${context.transaction_type} discussion`,
        data: {
          action: "thread_created",
          creator: userData.creator,
          transaction_type: context.transaction_type,
          ...context.metadata,
        },
      },

      participant_added: {
        text: `${userData.added_user || "Someone"} joined the conversation`,
        data: {
          action: "participant_added",
          added_user: userData.added_user,
          added_by: userData.added_by,
        },
      },

      participant_removed: {
        text: `${userData.removed_user || "Someone"} left the conversation`,
        data: {
          action: "participant_removed",
          removed_user: userData.removed_user,
          removed_by: userData.removed_by,
        },
      },

      carpool_status_changed: {
        text: `Carpool status updated to: ${userData.new_status}`,
        data: {
          action: "carpool_status_changed",
          old_status: userData.old_status,
          new_status: userData.new_status,
          changed_by: userData.changed_by,
        },
      },

      book_borrowed: {
        text: `${userData.borrower} borrowed "${context.metadata?.book?.title}"`,
        data: {
          action: "book_borrowed",
          borrower: userData.borrower,
          book_title: context.metadata?.book?.title,
          due_date: userData.due_date,
        },
      },

      book_returned: {
        text: `${userData.borrower} returned "${context.metadata?.book?.title}"`,
        data: {
          action: "book_returned",
          borrower: userData.borrower,
          book_title: context.metadata?.book?.title,
          return_condition: userData.return_condition,
        },
      },

      bike_checked_out: {
        text: `${userData.borrower} checked out the ${context.metadata?.bike?.model}`,
        data: {
          action: "bike_checked_out",
          borrower: userData.borrower,
          bike_model: context.metadata?.bike?.model,
          checkout_time: userData.checkout_time,
        },
      },

      bike_returned: {
        text: `${userData.borrower} returned the ${context.metadata?.bike?.model}`,
        data: {
          action: "bike_returned",
          borrower: userData.borrower,
          bike_model: context.metadata?.bike?.model,
          return_condition: userData.return_condition,
        },
      },

      trip_completed: {
        text: `Carpool trip completed successfully! 🎉`,
        data: {
          action: "trip_completed",
          completion_time: userData.completion_time,
          participants: userData.participants,
        },
      },

      reminder_sent: {
        text: `Reminder: ${userData.reminder_text}`,
        data: {
          action: "reminder_sent",
          reminder_type: userData.reminder_type,
          reminder_text: userData.reminder_text,
        },
      },
    };

    return (
      messages[action] || {
        text: `System notification: ${action}`,
        data: { action, ...userData },
      }
    );
  }

  /**
   * Get contextual suggestions for message composition
   */
  static getMessageSuggestions(transactionType, threadMetadata, currentUser) {
    const suggestions = {
      carpool: [
        "What time should we meet?",
        "I'll be running 5 minutes late",
        "Thanks for the ride!",
        "Can we make a quick stop?",
        "What's the pickup location exactly?",
        "Should we split gas costs?",
        "Great trip, thanks everyone!",
      ],

      book_sharing: [
        "Is this book still available?",
        "How long can I borrow it?",
        "Thanks for sharing!",
        "I've finished reading, ready to return",
        "Would you recommend this book?",
        "Any other books by this author?",
        "This book was amazing!",
      ],

      bike_sharing: [
        "Is the bike available today?",
        "Where exactly is it parked?",
        "How's the bike condition?",
        "Thanks for letting me borrow it!",
        "I've returned the bike safely",
        "The bike needs some maintenance",
        "Great bike, rides smoothly!",
      ],

      general: [
        "Thanks for the help!",
        "Let me know if you need anything",
        "Sounds good to me",
        "I'll check and get back to you",
        "Thanks for organizing this",
      ],
    };

    return suggestions[transactionType] || suggestions.general;
  }

  /**
   * Generate contextual thread summary
   */
  static generateThreadSummary(thread, messageCount, lastActivity) {
    const { transaction_type, metadata, participants } = thread;
    let summary = "";

    switch (transaction_type) {
      case "carpool":
        const carpool = metadata?.carpool;
        summary = `Carpool from ${carpool?.origin} to ${carpool?.destination} on ${carpool?.date}. `;
        summary += `${participants.length} participant${participants.length !== 1 ? "s" : ""}, `;
        summary += `${messageCount} message${messageCount !== 1 ? "s" : ""}`;
        break;

      case "book_sharing":
        const book = metadata?.book;
        summary = `Discussion about "${book?.title}" by ${book?.author}. `;
        summary += `${participants.length} participant${participants.length !== 1 ? "s" : ""}, `;
        summary += `${messageCount} message${messageCount !== 1 ? "s" : ""}`;
        break;

      case "bike_sharing":
        const bike = metadata?.bike;
        summary = `${bike?.model} bike sharing discussion. `;
        summary += `${participants.length} participant${participants.length !== 1 ? "s" : ""}, `;
        summary += `${messageCount} message${messageCount !== 1 ? "s" : ""}`;
        break;

      default:
        summary = `${thread.title}. `;
        summary += `${participants.length} participant${participants.length !== 1 ? "s" : ""}, `;
        summary += `${messageCount} message${messageCount !== 1 ? "s" : ""}`;
    }

    if (lastActivity) {
      const timeDiff = Date.now() - new Date(lastActivity).getTime();
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);

      if (days > 0) {
        summary += `. Last activity ${days} day${days !== 1 ? "s" : ""} ago`;
      } else if (hours > 0) {
        summary += `. Last activity ${hours} hour${hours !== 1 ? "s" : ""} ago`;
      } else {
        summary += ". Active recently";
      }
    }

    return summary;
  }

  /**
   * Determine if a user should be auto-added to a thread based on context
   */
  static shouldAutoAddUser(transactionType, transactionData, userId, userRole) {
    switch (transactionType) {
      case "carpool":
        // Auto-add if user is the driver or a confirmed rider
        return (
          transactionData.driver_id === userId ||
          transactionData.riders?.some(
            (rider) => rider.user_id === userId && rider.status === "confirmed"
          )
        );

      case "book_sharing":
        // Auto-add if user is the book owner or current borrower
        return (
          transactionData.owner_id === userId ||
          transactionData.current_borrower_id === userId
        );

      case "bike_sharing":
        // Auto-add if user is the bike owner or current borrower
        return (
          transactionData.owner_id === userId ||
          transactionData.current_borrower_id === userId
        );

      default:
        return false;
    }
  }

  /**
   * Get relevant participants for a transaction
   */
  static getRelevantParticipants(transactionType, transactionData) {
    const participants = [];

    switch (transactionType) {
      case "carpool":
        // Add driver
        if (transactionData.driver_id && transactionData.driver_name) {
          participants.push({
            user_id: transactionData.driver_id,
            name: transactionData.driver_name,
            role: "owner",
          });
        }

        // Add confirmed riders
        if (transactionData.riders) {
          transactionData.riders
            .filter((rider) => rider.status === "confirmed")
            .forEach((rider) => {
              participants.push({
                user_id: rider.user_id,
                name: rider.name,
                role: "participant",
              });
            });
        }
        break;

      case "book_sharing":
        // Add book owner
        if (transactionData.owner_id && transactionData.owner_name) {
          participants.push({
            user_id: transactionData.owner_id,
            name: transactionData.owner_name,
            role: "owner",
          });
        }

        // Add current borrower if exists
        if (
          transactionData.current_borrower_id &&
          transactionData.current_borrower_name
        ) {
          participants.push({
            user_id: transactionData.current_borrower_id,
            name: transactionData.current_borrower_name,
            role: "participant",
          });
        }
        break;

      case "bike_sharing":
        // Add bike owner
        if (transactionData.owner_id && transactionData.owner_name) {
          participants.push({
            user_id: transactionData.owner_id,
            name: transactionData.owner_name,
            role: "owner",
          });
        }

        // Add current borrower if exists
        if (
          transactionData.current_borrower_id &&
          transactionData.current_borrower_name
        ) {
          participants.push({
            user_id: transactionData.current_borrower_id,
            name: transactionData.current_borrower_name,
            role: "participant",
          });
        }
        break;
    }

    return participants;
  }

  /**
   * Generate contextual notification text
   */
  static generateNotificationText(messageData, threadContext) {
    const { sender, content, message_type } = messageData;
    const { transaction_type, metadata } = threadContext;

    let contextPrefix = "";
    switch (transaction_type) {
      case "carpool":
        contextPrefix = `Carpool (${metadata?.carpool?.origin} → ${metadata?.carpool?.destination})`;
        break;
      case "book_sharing":
        contextPrefix = `Book: ${metadata?.book?.title}`;
        break;
      case "bike_sharing":
        contextPrefix = `Bike: ${metadata?.bike?.model}`;
        break;
      default:
        contextPrefix = threadContext.title;
    }

    let messagePreview = "";
    switch (message_type) {
      case "text":
        messagePreview = content.text?.substring(0, 100) || "";
        break;
      case "image":
        messagePreview = "📷 Sent an image";
        break;
      case "file":
        messagePreview = `📎 Sent a file: ${content.file?.filename}`;
        break;
      case "location":
        messagePreview = "📍 Shared location";
        break;
      case "system":
        messagePreview = content.system?.action || "System message";
        break;
      default:
        messagePreview = "Sent a message";
    }

    return `${contextPrefix}: ${sender.name}: ${messagePreview}`;
  }
}

module.exports = ContextService;
