// src/json-schemas/reports/report.schema.js
// Structural input hygiene only — month validity is checked in the handler.

const MONTH_PATTERN = '^\\d{4}-\\d{2}$'; // YYYY-MM (shape only; validity checked in handler)

export const monthlyReportSchema = {
  querySchema: {
    type: 'object',
    // Optional — the controller defaults it to the current business month
    properties: {
      month: { type: 'string', pattern: MONTH_PATTERN }
    }
  }
};
