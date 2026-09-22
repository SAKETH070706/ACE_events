import mongoose from "mongoose";

const emailTemplateSchema = {
  subject: {
    type: String,
    default: "",
    trim: true,
  },
  html: {
    type: String,
    default: "",
  },
};

const eventSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    eventDate: {
      type: Date,
      required: true,
    },

    eventTime: {
      type: String,
      default: "",
      trim: true,
    },

    venue: {
      type: String,
      default: "",
      trim: true,
    },

    workflow: {
      preEvent: {
        type: Boolean,
        default: true,
      },
      postEvent: {
        type: Boolean,
        default: true,
      },
    },

    archived: {
      type: Boolean,
      default: false,
    },

    archivedAt: {
      type: Date,
      default: null,
    },

    preEvent: {
      recipientSource: {
        type: String,
        enum: ["csv", "excel", "googleForm", "googleSheet"],
        default: null,
      },

      sourceConfig: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },

      emailTemplate: {
        type: emailTemplateSchema,
        default: () => ({
          subject: "",
          html: "",
        }),
      },

      status: {
        type: String,
        enum: ["Idle", "Running", "Completed", "Failed"],
        default: "Idle",
      },

      totalRecipients: {
        type: Number,
        default: 0,
      },

      sent: {
        type: Number,
        default: 0,
      },

      failed: {
        type: Number,
        default: 0,
      },

      startedAt: {
        type: Date,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
      },

      sentEmails: {
        type: [String],
        default: [],
      },
    },

    postEvent: {
      participantSource: {
        type: String,
        enum: ["googleSheet", "csv", "excel", "checkIn"],
        default: null,
      },

      sourceConfig: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },

      certificateEmailTemplate: {
        type: emailTemplateSchema,
        default: () => ({
          subject: "",
          html: "",
        }),
      },

      status: {
        type: String,
        enum: ["Idle", "Running", "Completed", "Failed"],
        default: "Idle",
      },

      totalRecipients: {
        type: Number,
        default: 0,
      },

      sent: {
        type: Number,
        default: 0,
      },

      failed: {
        type: Number,
        default: 0,
      },

      startedAt: {
        type: Date,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
      },

      sentEmails: {
        type: [String],
        default: [],
      },
    },

    registrationSource: {
      type: String,
      enum: ["google", "excel"],
      default: "google",
    },

    googleForm: {
      url: {
        type: String,
        default: "",
        trim: true,
      },

      formId: {
        type: String,
        default: "",
        trim: true,
      },
    },

    googleSheet: {
      url: {
        type: String,
        default: "",
        trim: true,
      },

      sheetId: {
        type: String,
        default: "",
        trim: true,
      },

      sheetName: {
        type: String,
        default: "",
        trim: true,
      },
    },

    template: {
      url: {
        type: String,
        required: function () {
          return this.workflow?.postEvent === true;
        },
      },

      publicId: {
        type: String,
        required: function () {
          return this.workflow?.postEvent === true;
        },
      },

      namePosition: {
        x: {
          type: Number,
          default: 0,
        },

        y: {
          type: Number,
          default: 700,
        },

        align: {
          type: String,
          enum: ["left", "center", "right"],
          default: "center",
        },
      },

      font: {
        family: {
          type: String,
          default: "TimesRoman",
        },

        weight: {
          type: String,
          enum: ["Regular", "Bold", "Italic", "BoldItalic"],
          default: "Bold",
        },

        size: {
          type: Number,
          default: 80,
          min: 1,
        },

        color: {
          type: String,
          default: "#8B5A2B",
        },
      },

      rotation: {
        type: Number,
        default: 0,
      },

      maxWidth: {
        type: Number,
        default: 0,
      },
    },

    status: {
      type: String,
      enum: [
        "Draft",
        "Ready",
        "Processing",
        "Partially Completed",
        "Completed",
        "Archived",
      ],
      default: "Draft",
    },
    checkIn: {
     enabled: {
        type: Boolean,
        default: false,
    },

    participantSource: {
        type: String,
        enum: ["csv", "excel", "googleSheet"],
        default: null,
    },

    sourceConfig: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },

    sessions: [
        {
            sessionId: {
                type: String,
                required: true,
            },

            date: {
                type: String,
                required: true,
            },

            name: {
                type: String,
                required: true,
            },

            startTime: {
                type: String,
                required: true,
            },

            endTime: {
                type: String,
                required: true,
            },
        },
    ],

    attendanceRequired: {
        type: Number,
        default: 75,
        min: 0,
        max: 100,
    },
},

    automation: {
      status: {
        type: String,
        enum: ["Idle", "Running", "Completed", "Failed"],
        default: "Idle",
      },

      totalParticipants: {
        type: Number,
        default: 0,
      },

      processed: {
        type: Number,
        default: 0,
      },

      success: {
        type: Number,
        default: 0,
      },

      failed: {
        type: Number,
        default: 0,
      },

      startedAt: {
        type: Date,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
      },

      currentParticipantIndex: {
        type: Number,
        default: 0,
      },

      sentEmails: {
        type: [String],
        default: [],
      },
    },
  },
  {
    timestamps: true,
  }
);

const Event = mongoose.model("Event", eventSchema);

export default Event;