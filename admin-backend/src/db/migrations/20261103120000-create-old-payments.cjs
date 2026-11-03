'use strict';

// Standalone "old payment received" entries — money collected now for orders
// from the pre-app era (10 years of paper books) that were never entered in
// the system. payment_date is the business-local day the money arrived
// (DATEONLY, YYYY-MM-DD in Asia/Kolkata), so it lands in that day's ledger
// without any order or customer row.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('old_payments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      payment_date: {
        // Business-local calendar day the money was received
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      payer_name: {
        // Who paid — free text (often only a name from the old book)
        type: Sequelize.STRING(100),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      note: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      created_by: {
        // Logical ref to users.id (user-backend) — no FK, same convention as
        // audit_logs.actor_id / expenses.created_by.
        type: Sequelize.UUID,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Day view lists one day at a time; reports group by month
    await queryInterface.addIndex('old_payments', ['payment_date']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('old_payments');
  }
};
