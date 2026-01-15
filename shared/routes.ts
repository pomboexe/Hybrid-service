import { z } from 'zod';
import { insertTicketSchema, insertKnowledgeSchema, tickets, knowledgeBase } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  tickets: {
    list: {
      method: 'GET' as const,
      path: '/api/tickets',
      responses: {
        200: z.array(z.custom<typeof tickets.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/tickets/:id',
      responses: {
        200: z.custom<typeof tickets.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/tickets',
      input: insertTicketSchema,
      responses: {
        201: z.custom<typeof tickets.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/tickets/:id',
      input: insertTicketSchema.partial().extend({
        status: z.enum(['open', 'resolved', 'escalated']).optional(),
      }),
      responses: {
        200: z.custom<typeof tickets.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  knowledge: {
    list: {
      method: 'GET' as const,
      path: '/api/knowledge',
      responses: {
        200: z.array(z.custom<typeof knowledgeBase.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/knowledge',
      input: insertKnowledgeSchema,
      responses: {
        201: z.custom<typeof knowledgeBase.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
        method: 'DELETE' as const,
        path: '/api/knowledge/:id',
        responses: {
            204: z.void()
        }
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
