// src/services/reports/report.handler.js
// Read-only aggregations for the reports dashboard: one month's P&L,
// a month-by-month table, and the udhaar (pending money) customer index.
// Order/expense rows are matched on their DATEONLY business-day columns,
// so a month window is a plain string range over order_date/expense_date.
import db from '@src/db/models/index.js';
import { BaseHandler } from '@src/libs/base.handler.js';
import { AppError } from '@src/errors/app.error.js';
import Errors from '@src/errors/errorCodes.js';
import { todayInBusinessTimeZone } from '@src/helpers/time.helpers.js';

const { Order, Expense, OldPayment, Customer, Sequelize } = db;

const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const MONTHS_IN_TABLE = 12;

/** "YYYY-MM" expression for a DATEONLY column (Postgres needs to_char —
 * substr() has no date overload). */
const monthOf = (column) => Sequelize.fn('to_char', Sequelize.col(column), 'YYYY-MM');

/** True when the string is a real "YYYY-MM" calendar month. */
const isValidMonth = (value) => {
  if (!MONTH_PATTERN.test(String(value))) return false;
  const [year, mon] = value.split('-').map(Number);
  return mon >= 1 && mon <= 12 && new Date(Date.UTC(year, mon - 1, 1)).getUTCMonth() === mon - 1;
};

/** Inclusive start / exclusive end day strings for a "YYYY-MM" month. */
const monthDayRange = (month) => {
  const [year, mon] = month.split('-').map(Number);
  const start = `${year}-${String(mon).padStart(2, '0')}-01`;
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const end = `${nextYear}-${String(nextMon).padStart(2, '0')}-01`;
  return { start, end };
};

/** Current "YYYY-MM" in the business timezone. */
const currentBusinessMonth = () => todayInBusinessTimeZone().slice(0, 7);

/** Shift a "YYYY-MM" month by the given number of months. */
const shiftMonth = (month, delta) => {
  const [year, mon] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

/** Sum rows of a grouped query into { month -> {sale, received} }. */
const sumOrdersByMonth = (rows) => {
  const map = new Map();
  for (const row of rows) {
    map.set(row.getDataValue('month'), {
      ordersCount: Number(row.get('orders_count')) || 0,
      totalSale: Number(row.get('total_sale')) || 0,
      totalReceived: Number(row.get('total_received')) || 0
    });
  }
  return map;
};

/** Month P&L for a single month: order + expense aggregates joined. */
const monthReport = async (month, transaction) => {
  const { start, end } = monthDayRange(month);

  const orderRow = await Order.findOne({
    attributes: [
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'orders_count'],
      [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'total_sale'],
      [Sequelize.fn('SUM', Sequelize.col('amount_received')), 'total_received']
    ],
    where: {
      order_date: { [Sequelize.Op.gte]: start, [Sequelize.Op.lt]: end }
    },
    transaction
  });

  const expenseRows = await Expense.findAll({
    attributes: [
      'category',
      [Sequelize.fn('SUM', Sequelize.col('amount')), 'total']
    ],
    where: {
      expense_date: { [Sequelize.Op.gte]: start, [Sequelize.Op.lt]: end }
    },
    group: ['category'],
    order: [['category', 'ASC']],
    transaction
  });

  const oldPaymentRow = await OldPayment.findOne({
    attributes: [
      [Sequelize.fn('SUM', Sequelize.col('amount')), 'total_old_payments']
    ],
    where: {
      payment_date: { [Sequelize.Op.gte]: start, [Sequelize.Op.lt]: end }
    },
    transaction
  });

  const totalSale = Number(orderRow?.get('total_sale')) || 0;
  const totalReceived = Number(orderRow?.get('total_received')) || 0;
  const totalOldPayments = Number(oldPaymentRow?.get('total_old_payments')) || 0;
  const expensesByCategory = {};
  let totalExpense = 0;
  for (const row of expenseRows) {
    const total = Number(row.get('total')) || 0;
    expensesByCategory[row.category] = total;
    totalExpense += total;
  }

  return {
    month,
    orders_count: Number(orderRow?.get('orders_count')) || 0,
    total_sale: totalSale,
    total_received: totalReceived,
    // Money collected this month for pre-app orders (no order row exists)
    old_payments_total: totalOldPayments,
    total_expense: totalExpense,
    // Real cash generated this month: received (incl. old payments) minus
    // spent. Pending udhaar is NOT counted — it is not in hand yet.
    in_hand: totalReceived + totalOldPayments - totalExpense,
    // This month's billed money not yet collected (across all months until paid)
    pending: Math.max(0, totalSale - totalReceived),
    expenses_by_category: expensesByCategory
  };
};

const assertValidMonth = (month, traceId) => {
  if (!isValidMonth(month)) {
    throw new AppError(Errors.INVALID_INPUT, {
      traceId,
      field: 'month',
      message: 'month must be a valid YYYY-MM'
    });
  }
  // Months are report windows, not ledger days — future months have no data,
  // but browsing ahead is meaningless, so block them like the day dashboard.
  if (month > currentBusinessMonth()) {
    throw new AppError(Errors.INVALID_INPUT, {
      traceId,
      field: 'month',
      message: 'month cannot be in the future'
    });
  }
};

export class MonthlyReportHandler extends BaseHandler {
  /**
   * One month's report: totals (sale, received, expense, in hand, pending)
   * plus an expense breakdown by category.
   */
  async run () {
    const month = this.args.month ?? currentBusinessMonth();
    assertValidMonth(month, this.traceId);
    return monthReport(month, this.dbTransaction);
  }
}

export class MonthsReportHandler extends BaseHandler {
  /**
   * Month-by-month table for the last 12 business months (current month
   * first), each row with the same totals shape as the monthly report
   * minus the category breakdown.
   */
  async run () {
    const current = currentBusinessMonth();

    const orderRows = await Order.findAll({
      attributes: [
        [monthOf('order_date'), 'month'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'orders_count'],
        [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'total_sale'],
        [Sequelize.fn('SUM', Sequelize.col('amount_received')), 'total_received']
      ],
      where: {
        order_date: {
          [Sequelize.Op.gte]: monthDayRange(shiftMonth(current, -(MONTHS_IN_TABLE - 1))).start,
          [Sequelize.Op.lt]: monthDayRange(current).end
        }
      },
      group: [monthOf('order_date')],
      transaction: this.dbTransaction
    });

    const expenseRows = await Expense.findAll({
      attributes: [
        [monthOf('expense_date'), 'month'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total_expense']
      ],
      where: {
        expense_date: {
          [Sequelize.Op.gte]: monthDayRange(shiftMonth(current, -(MONTHS_IN_TABLE - 1))).start,
          [Sequelize.Op.lt]: monthDayRange(current).end
        }
      },
      group: [monthOf('expense_date')],
      transaction: this.dbTransaction
    });

    const oldPaymentRows = await OldPayment.findAll({
      attributes: [
        [monthOf('payment_date'), 'month'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total_old_payments']
      ],
      where: {
        payment_date: {
          [Sequelize.Op.gte]: monthDayRange(shiftMonth(current, -(MONTHS_IN_TABLE - 1))).start,
          [Sequelize.Op.lt]: monthDayRange(current).end
        }
      },
      group: [monthOf('payment_date')],
      transaction: this.dbTransaction
    });

    const ordersByMonth = sumOrdersByMonth(orderRows);
    const expenseByMonth = new Map(
      expenseRows.map((row) => [row.getDataValue('month'), Number(row.get('total_expense')) || 0])
    );
    const oldPaymentByMonth = new Map(
      oldPaymentRows.map((row) => [row.getDataValue('month'), Number(row.get('total_old_payments')) || 0])
    );

    // Fill all 12 months (empty months show zeros) — gaps hide the trend
    const months = [];
    for (let i = 0; i < MONTHS_IN_TABLE; i += 1) {
      const month = shiftMonth(current, -i);
      const orders = ordersByMonth.get(month);
      const totalExpense = expenseByMonth.get(month) ?? 0;
      const totalOldPayments = oldPaymentByMonth.get(month) ?? 0;
      const totalSale = orders?.totalSale ?? 0;
      const totalReceived = orders?.totalReceived ?? 0;
      months.push({
        month,
        orders_count: orders?.ordersCount ?? 0,
        total_sale: totalSale,
        total_received: totalReceived,
        old_payments_total: totalOldPayments,
        total_expense: totalExpense,
        in_hand: totalReceived + totalOldPayments - totalExpense,
        pending: Math.max(0, totalSale - totalReceived)
      });
    }
    return { months };
  }
}

export class PendingCustomersHandler extends BaseHandler {
  /**
   * Udhaar index: every customer with money outstanding (any order where
   * amount_received < total_amount), grouped per customer — pending total,
   * pending order count, and how long the OLDEST pending order has been
   * open (oldest_pending_date). Largest dues first, then oldest first.
   */
  async run () {
    // HAVING (not WHERE) filters on the aggregated per-customer pending sum
    const rows = await Order.findAll({
      attributes: [
        'customer_id',
        [Sequelize.fn('SUM', Sequelize.literal('total_amount - amount_received')), 'pending'],
        // Qualified with the main-table alias ("Order") — plain "id" is
        // ambiguous once the customers join is added
        [Sequelize.fn('COUNT', Sequelize.col('Order.id')), 'orders_count'],
        [Sequelize.fn('MIN', Sequelize.col('Order.order_date')), 'oldest_pending_date'],
        [Sequelize.fn('MAX', Sequelize.col('Order.order_date')), 'latest_order_date']
      ],
      group: ['customer_id', 'customer.id'],
      having: Sequelize.literal('SUM(total_amount - amount_received) > 0'),
      order: [[Sequelize.literal('pending'), 'DESC'], [Sequelize.literal('oldest_pending_date'), 'ASC']],
      include: [{
        model: Customer,
        as: 'customer',
        attributes: ['id', 'name', 'phone', 'preferred_language']
      }],
      transaction: this.dbTransaction
    });

    const items = rows
      .map((row) => ({
        customer: row.customer
          ? {
              id: row.customer.id,
              name: row.customer.name,
              phone: row.customer.phone,
              preferred_language: row.customer.preferred_language
            }
          : null,
        pending: Number(row.get('pending')) || 0,
        orders_count: Number(row.get('orders_count')) || 0,
        oldest_pending_date: row.get('oldest_pending_date'),
        latest_order_date: row.get('latest_order_date')
      }))
      .filter((item) => item.customer && item.pending > 0);

    const totalPending = items.reduce((sum, item) => sum + item.pending, 0);
    const oldest = items.reduce(
      (min, item) => (item.oldest_pending_date && item.oldest_pending_date < min ? item.oldest_pending_date : min),
      todayInBusinessTimeZone()
    );

    return { items, total_pending: totalPending, oldest_pending_date: items.length > 0 ? oldest : null };
  }
}
