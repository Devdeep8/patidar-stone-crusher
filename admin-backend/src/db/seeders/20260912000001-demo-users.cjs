'use strict';

const { randomUUID } = require('crypto');
const bcrypt = require('bcrypt');

// Demo login for the crusher plant staff app (dev/staging only).
const DEMO_USERS = [
  {
    name: 'Plant Staff',
    email: 'staff@crusher.com',
    password: 'Staff@123'
  }
];

module.exports = {
  up: async (queryInterface) => {
    const hashingRounds = parseInt(process.env.HASHING_ROUNDS || '10', 10);
    const now = new Date();

    const rows = await Promise.all(DEMO_USERS.map(async (user) => ({
      id: randomUUID(),
      name: user.name,
      email: user.email,
      password: await bcrypt.hash(user.password, hashingRounds),
      is_active: true,
      created_at: now,
      updated_at: now
    })));

    await queryInterface.bulkInsert('users', rows, {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('users', {
      email: DEMO_USERS.map(user => user.email)
    }, {});
  }
};
