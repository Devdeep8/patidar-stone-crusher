// OldPaymentsController: old-payment-received endpoints, delegates business
// logic to handlers
import { sendResponse } from '@src/helpers/response.helpers.js';
import {
  CreateOldPaymentHandler,
  ListOldPaymentsHandler,
  DeleteOldPaymentHandler
} from '@src/services/oldPayments/oldPayment.handler.js';
import { todayInBusinessTimeZone } from '@src/helpers/time.helpers.js';

class OldPaymentsController {
  /** POST /api/v1/old-payments — record one old-payment entry (defaults to today) */
  static async createOldPayment(req, res, next) {
    const result = await CreateOldPaymentHandler.execute({ ...req.body }, req.context);
    sendResponse({ req, res, next }, result, 'Old payment recorded successfully');
  }

  /** GET /api/v1/old-payments?date=YYYY-MM-DD — one day's entries + total */
  static async listOldPayments(req, res, next) {
    const result = await ListOldPaymentsHandler.execute(
      { date: req.query.date ?? todayInBusinessTimeZone() },
      req.context
    );
    sendResponse({ req, res, next }, result, 'Old payments retrieved successfully');
  }

  /** DELETE /api/v1/old-payments/:id — remove a mistyped entry */
  static async deleteOldPayment(req, res, next) {
    const result = await DeleteOldPaymentHandler.execute({ ...req.params }, req.context);
    sendResponse({ req, res, next }, result, 'Old payment deleted successfully');
  }
}

export default OldPaymentsController;
