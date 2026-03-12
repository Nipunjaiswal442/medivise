/**
 * In-memory user store (replace with a real database in production).
 * Passwords are bcrypt hashed — default password for seed users is: Medivise@2024
 */
const bcrypt = require('bcryptjs');

// Pre-hashed "Medivise@2024"
const DEFAULT_HASH = bcrypt.hashSync('Medivise@2024', 10);

const users = [
  {
    id: '1',
    email: 'dr.smith@medivise.com',
    password: DEFAULT_HASH,
    name: 'Dr. Sarah Smith',
    role: 'physician',
    specialty: 'Internal Medicine',
    licenseNumber: 'MD-12345',
    avatar: null,
  },
  {
    id: '2',
    email: 'admin@medivise.com',
    password: DEFAULT_HASH,
    name: 'Admin User',
    role: 'admin',
    specialty: null,
    licenseNumber: null,
    avatar: null,
  },
];

const findByEmail = (email) =>
  users.find((u) => u.email.toLowerCase() === email.toLowerCase());

const findById = (id) => users.find((u) => u.id === id);

let nextId = users.length + 1;
const addUser = (userData) => {
  const user = { id: String(nextId++), ...userData };
  users.push(user);
  return user;
};

module.exports = { users, findByEmail, findById, addUser };
