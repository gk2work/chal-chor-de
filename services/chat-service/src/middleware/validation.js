const Joi = require("joi");
const logger = require("../utils/logger");

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);

    if (error) {
      logger.warn("Validation error", {
        error: error.details[0].message,
        path: error.details[0].path,
        body: req.body,
      });

      return res.status(400).json({
        error: "Validation error",
        message: error.details[0].message,
        field: error.details[0].path[0],
      });
    }

    next();
  };
};

// Validation schemas
const schemas = {
  createThread: Joi.object({
    transaction_type: Joi.string()
      .valid("carpool", "book_sharing", "bike_sharing", "general")
      .required(),
    transaction_id: Joi.string().required(),
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(500).optional(),
    participants: Joi.array()
      .items(
        Joi.object({
          user_id: Joi.string().required(),
          name: Joi.string().required(),
          role: Joi.string()
            .valid("owner", "participant", "admin")
            .default("participant"),
        })
      )
      .min(1)
      .required(),
    metadata: Joi.object().optional(),
  }),

  sendMessage: Joi.object({
    message_type: Joi.string()
      .valid("text", "image", "file", "system", "location")
      .default("text"),
    content: Joi.object({
      text: Joi.string().max(2000).when("message_type", {
        is: "text",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      file: Joi.object({
        url: Joi.string().uri().required(),
        filename: Joi.string().required(),
        size: Joi.number().positive().required(),
        mime_type: Joi.string().required(),
      }).when("message_type", {
        is: Joi.valid("image", "file"),
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      location: Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
        address: Joi.string().optional(),
      }).when("message_type", {
        is: "location",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      system: Joi.object({
        action: Joi.string().required(),
        data: Joi.any().optional(),
      }).when("message_type", {
        is: "system",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }).required(),
    reply_to: Joi.object({
      message_id: Joi.string().required(),
      preview: Joi.string().max(100).optional(),
    }).optional(),
    mentions: Joi.array()
      .items(
        Joi.object({
          user_id: Joi.string().required(),
          name: Joi.string().required(),
          start_index: Joi.number().min(0).required(),
          end_index: Joi.number().min(0).required(),
        })
      )
      .optional(),
    client_message_id: Joi.string().optional(),
  }),

  editMessage: Joi.object({
    content: Joi.string().min(1).max(2000).required(),
  }),

  addReaction: Joi.object({
    emoji: Joi.string().min(1).max(10).required(),
  }),

  updateThread: Joi.object({
    title: Joi.string().min(1).max(200).optional(),
    description: Joi.string().max(500).optional(),
    status: Joi.string().valid("active", "archived", "closed").optional(),
  }),

  addParticipant: Joi.object({
    user_id: Joi.string().required(),
    name: Joi.string().required(),
    role: Joi.string()
      .valid("owner", "participant", "admin")
      .default("participant"),
  }),

  searchMessages: Joi.object({
    query: Joi.string().min(1).max(100).required(),
    limit: Joi.number().min(1).max(50).default(20),
  }),
};

module.exports = {
  validate,
  schemas,
};
