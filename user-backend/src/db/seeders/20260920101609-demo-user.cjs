'use strict';

// Idempotent demo-user seed so the login screen's hint
// (staff@crusher.com / Staff@123) works without manual SQL.
// Safe to run repeatedly: creates the user when missing, rehashes the
// advertised password when an existing row was inserted by hand.

const bcrypt = require('bcrypt');

const DEMO_EMAIL = 'staff@crusher.com';
const DEMO_NAME = 'Plant Staff';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Staff@123';
const HASHING_ROUNDS = parseInt(process.env.HASHING_ROUNDS || '10', 10);

module.exports = {
  up: async (queryInterface) => {
    const existing = await queryInterface.sequelize.query(
      'SELECT id, password FROM users WHERE email = :email',
      { replacements: { email: DEMO_EMAIL }, type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (existing.length === 0) {
      await queryInterface.insert('users', 'users', {
        id: queryInterface.sequelize.fn('gen_random_uuid'),
        name: DEMO_NAME,
        email: DEMO_EMAIL,
        password: await bcrypt.hash(DEMO_PASSWORD, HASHING_ROUNDS),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      return;
    }

    const matches = await bcrypt.compare(DEMO_PASSWORD, existing[0].password);
    if (!matches) {
      await queryInterface.sequelize.query(
        'UPDATE users SET password = :password, updated_at = NOW() WHERE email = :email',
        { replacements: { password: await bcrypt.hash(DEMO_PASSWORD, HASHING_ROUNDS), email: DEMO_EMAIL } }
      );
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('users', { email: DEMO_EMAIL });
  }
};
