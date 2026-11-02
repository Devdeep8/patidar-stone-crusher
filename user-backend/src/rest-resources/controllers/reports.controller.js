// ReportsController: report endpoints, delegates aggregation to handlers
import { sendResponse } from '@src/helpers/response.helpers.js';
import {
  MonthlyReportHandler,
  MonthsReportHandler,
  PendingCustomersHandler
} from '@src/services/reports/report.handler.js';

class ReportsController {
  /** GET /api/v1/reports/monthly?month=YYYY-MM — one month's totals */
  static async monthly(req, res, next) {
    const result = await MonthlyReportHandler.execute({ month: req.query.month }, req.context);
    sendResponse({ req, res, next }, result, 'Monthly report retrieved successfully');
  }

  /** GET /api/v1/reports/months — last 12 months, newest first */
  static async months(req, res, next) {
    const result = await MonthsReportHandler.execute({}, req.context);
    sendResponse({ req, res, next }, result, 'Monthly summary retrieved successfully');
  }

  /** GET /api/v1/reports/pending-customers — udhaar index with ageing */
  static async pendingCustomers(req, res, next) {
    const result = await PendingCustomersHandler.execute({}, req.context);
    sendResponse({ req, res, next }, result, 'Pending customers retrieved successfully');
  }
}

export default ReportsController;
