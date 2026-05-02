import type { Express } from "express";
import swaggerUi from "swagger-ui-express";

const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "Classify API",
    description: "Kids Educational & Parental Control Platform API",
    version: "3.0.0",
    contact: { name: "Classify Engineering", url: "https://classi-fy.com" },
  },
  servers: [
    { url: "/api", description: "API Server" },
  ],
  tags: [
    { name: "Health", description: "Health check endpoints" },
    { name: "Auth", description: "Authentication & registration" },
    { name: "Parent", description: "Parent management & dashboard" },
    { name: "Child", description: "Child actions & progress" },
    { name: "Teacher", description: "Teacher management" },
    { name: "Family", description: "Family management" },
    { name: "Notifications", description: "Notification management" },
    { name: "Gifts", description: "Gift & reward system" },
    { name: "Store", description: "Store & purchases" },
    { name: "Admin", description: "Admin operations" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "object" },
          message: { type: "string" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string", example: "ERROR_CODE" },
          message: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Server is healthy",
            content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", example: "ok" } } } } },
          },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new parent account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password", "phone"],
                properties: {
                  name: { type: "string", example: "Ahmed" },
                  email: { type: "string", format: "email", example: "ahmed@example.com" },
                  password: { type: "string", minLength: 6 },
                  phone: { type: "string", example: "+201234567890" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Registration successful", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login with email/password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Login successful, returns JWT token" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/auth/request-otp": {
      post: {
        tags: ["Auth"],
        summary: "Request OTP code for 2FA",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "OTP sent via email" },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/auth/verify-otp": {
      post: {
        tags: ["Auth"],
        summary: "Verify OTP and complete 2FA",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "otp"],
                properties: {
                  email: { type: "string", format: "email" },
                  otp: { type: "string", example: "123456" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "OTP verified, returns JWT token" },
          "400": { description: "Invalid or expired OTP" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Logged out" } },
      },
    },
    "/parent/info": {
      get: {
        tags: ["Parent"],
        summary: "Get current parent info",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Parent profile data" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/parent/children": {
      get: {
        tags: ["Family"],
        summary: "List parent's children",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Array of children" } },
      },
    },
    "/parent/children/{childId}/reports": {
      get: {
        tags: ["Parent"],
        summary: "Get child report",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "childId", in: "path", required: true, schema: { type: "string" } },
          { name: "period", in: "query", schema: { type: "string", enum: ["daily", "weekly", "monthly"], default: "weekly" } },
        ],
        responses: { "200": { description: "Report data with tasks summary and subject breakdown" } },
      },
    },
    "/parent/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List parent notifications",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
        ],
        responses: { "200": { description: "Paginated notifications" } },
      },
    },
    "/parent/notifications/{id}": {
      put: {
        tags: ["Notifications"],
        summary: "Mark notification as read",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Notification updated" } },
      },
      delete: {
        tags: ["Notifications"],
        summary: "Delete a notification",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Notification deleted" } },
      },
    },
    "/parent/deposit": {
      post: {
        tags: ["Parent"],
        summary: "Request a deposit to child wallet",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["childId", "amount"],
                properties: {
                  childId: { type: "string" },
                  amount: { type: "number", minimum: 1 },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Deposit request created" } },
      },
    },
    "/parent/gifts/send": {
      post: {
        tags: ["Gifts"],
        summary: "Send gift to child",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["childId", "giftType"],
                properties: {
                  childId: { type: "string" },
                  giftType: { type: "string" },
                  message: { type: "string" },
                  amount: { type: "number" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Gift sent" } },
      },
    },
    "/parent/audit-log": {
      get: {
        tags: ["Parent"],
        summary: "Get parent audit log",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "entity", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Paginated audit log entries" } },
      },
    },
    "/parent/events": {
      get: {
        tags: ["Parent"],
        summary: "SSE endpoint for real-time notifications",
        parameters: [{ name: "token", in: "query", required: true, schema: { type: "string" }, description: "JWT token" }],
        responses: {
          "200": { description: "SSE stream with notification events" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/parent/messages/conversations": {
      get: {
        tags: ["Parent"],
        summary: "List parent-teacher conversations",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Array of conversations with teacher info" } },
      },
      post: {
        tags: ["Parent"],
        summary: "Start or get conversation with teacher",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["teacherId"],
                properties: { teacherId: { type: "string" } },
              },
            },
          },
        },
        responses: { "200": { description: "Conversation" } },
      },
    },
    "/child/link": {
      post: {
        tags: ["Child"],
        summary: "Link child to parent account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["linkCode"],
                properties: { linkCode: { type: "string" } },
              },
            },
          },
        },
        responses: { "200": { description: "Child linked" } },
      },
    },
    "/child/complete-game": {
      post: {
        tags: ["Child"],
        summary: "Submit game completion",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["gameId", "score"],
                properties: {
                  gameId: { type: "string" },
                  score: { type: "number" },
                  timeSpent: { type: "number" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Game completion recorded" } },
      },
    },
    "/teacher/messages/conversations": {
      get: {
        tags: ["Teacher"],
        summary: "List teacher-parent conversations",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Array of conversations with parent info" } },
      },
    },
  },
};

export function registerSwaggerDocs(app: Express) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Classify API Documentation",
  }));
  
  // Also serve the raw OpenAPI JSON
  app.get("/api/openapi.json", (_req, res) => {
    res.json(swaggerDocument);
  });
}
