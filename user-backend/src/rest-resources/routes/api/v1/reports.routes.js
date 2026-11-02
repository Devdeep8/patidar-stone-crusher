// src/rest-resources/routes/api/v1/reports.routes.js
import { Router } from 'express';
import ReportsController from '@controllers/reports.controller.js';
import asyncHandler from '@src/utils/async-handler.js';
import contextMiddleware from '@src/rest-resources/middlewares/context.middleware.js';
import isUserAuthenticated from '@src/rest-resources/middlewares/isUserAuthenticated.middleware.js';
import requestValidationMiddleware from '@src/rest-resources/middlewares/requestValidation.middleware.js';
import { monthlyReportSchema } from '@src/json-schemas/reports/report.schema.js';

const router = Router();

/**
 * @route   GET /api/v1/reports/monthly?month=YYYY-MM
 * @desc    One month's totals: sale, received, expense, in hand, pending
 * @access  Private (read — no transaction)
 */
router.get(
  '/monthly',
  contextMiddleware(false),
  isUserAuthenticated(),
  requestValidationMiddleware(monthlyReportSchema),
  asyncHandler(ReportsController.monthly)
);

/**
 * @route   GET /api/v1/reports/months
 * @desc    Last 12 months' totals, newest month first
 * @access  Private (read — no transaction)
 */
router.get(
  '/months',
  contextMiddleware(false),
  isUserAuthenticated(),
  asyncHandler(ReportsController.months)
);

/**
 * @route   GET /api/v1/reports/pending-customers
 * @desc    Customers with outstanding udhaar, largest dues first, with ageing
 * @access  Private (read — no transaction)
 */
router.get(
  '/pending-customers',
  contextMiddleware(false),
  isUserAuthenticated(),
  asyncHandler(ReportsController.pendingCustomers)
);

export default router;
