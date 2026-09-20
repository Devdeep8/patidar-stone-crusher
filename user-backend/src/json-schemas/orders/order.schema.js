// src/json-schemas/orders/order.schema.js
// Structural input hygiene only — business rules like the strict 10-digit
// phone live in the service handlers (order.handler.js / customer.handler.js).

const MONTH_PATTERN = '^\\d{4}-(0[1-9]|1[0-2])$'; // YYYY-MM

export const createOrderSchema = {
  bodySchema: {
    type: 'object',
    required: ['phone', 'name'],
    additionalProperties: false,
    properties: {
      phone: { type: 'string', minLength: 1, maxLength: 20 },
      name: { type: 'string', minLength: 1, maxLength: 255 },
      // Optional: when omitted the handler computes quantity × rate
      total_amount: { type: 'number', exclusiveMinimum: 0 },
      amount_received: { type: 'number', minimum: 0, default: 0 },
      village: { type: 'string', minLength: 1, maxLength: 100 },
      material: { type: 'string', maxLength: 10 },
      grade: { type: 'string', maxLength: 50 },
      quantity: { type: 'integer' },
      rate: { type: 'number' },
      payment_type: { type: 'string', maxLength: 10 },
      note: { type: 'string', maxLength: 500 }
    }
  }
};

export const listOrdersSchema = {
  querySchema: {
    type: 'object',
    required: ['month'],
    properties: {
      month: { type: 'string', pattern: MONTH_PATTERN }
    }
  }
};

export const getOrderSchema = {
  paramsSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  }
};

export const updateOrderSchema = {
  paramsSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  },
  bodySchema: {
    type: 'object',
    required: ['amount_received'],
    additionalProperties: false,
    properties: {
      amount_received: { type: 'number', minimum: 0 }
    }
  }
};
