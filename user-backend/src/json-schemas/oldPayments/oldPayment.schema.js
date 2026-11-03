// src/json-schemas/oldPayments/oldPayment.schema.js
// Structural input hygiene only — payer_name/amount/date rules live in
// oldPayment.handler.js.

const DATE_PATTERN = '^\\d{4}-\\d{2}-\\d{2}$'; // YYYY-MM-DD (shape only; validity checked in handler)

export const createOldPaymentSchema = {
  bodySchema: {
    type: 'object',
    required: ['payer_name', 'amount'],
    additionalProperties: false,
    properties: {
      payer_name: { type: 'string', maxLength: 100 },
      amount: { type: 'number', exclusiveMinimum: 0 },
      note: { type: 'string', maxLength: 500 },
      // Optional — the handler defaults it to today (business timezone)
      date: { type: 'string', pattern: DATE_PATTERN }
    }
  }
};

export const listOldPaymentsSchema = {
  querySchema: {
    type: 'object',
    properties: {
      date: { type: 'string', pattern: DATE_PATTERN }
    }
  }
};

export const deleteOldPaymentSchema = {
  paramsSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  }
};
