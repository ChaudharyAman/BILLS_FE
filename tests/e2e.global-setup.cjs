const fs = require('fs');
const path = require('path');

require('../../MBB/node_modules/dotenv').config({
  path: path.join(__dirname, '..', '..', 'MBB', '.env'),
});

const mongoose = require('../../MBB/node_modules/mongoose');
const connectDB = require('../../MBB/db');
const User = require('../../MBB/models/User');
const Client = require('../../MBB/models/Client');
const Item = require('../../MBB/models/Item');
const Invoice = require('../../MBB/models/Invoice');
const Quote = require('../../MBB/models/Quote');
const Proforma = require('../../MBB/models/Proforma');
const PurchaseOrder = require('../../MBB/models/PurchaseOrder');
const Expense = require('../../MBB/models/Expense');
const Settings = require('../../MBB/models/Settings');

const TMP_DIR = path.join(__dirname, '.tmp');
const USERS_PATH = path.join(TMP_DIR, 'e2e-users.json');
const PREFIX = 'e2e-ui-';
const PASSWORD = 'Pass@123456';

async function cleanupUsers() {
  const users = await User.find({ username: { $regex: `^${PREFIX}` } }).select('_id');
  const ids = users.map((user) => user._id);
  if (ids.length === 0) return;

  await Promise.all([
    Client.deleteMany({ user: { $in: ids } }),
    Item.deleteMany({ user: { $in: ids } }),
    Invoice.deleteMany({ user: { $in: ids } }),
    Quote.deleteMany({ user: { $in: ids } }),
    Proforma.deleteMany({ user: { $in: ids } }),
    PurchaseOrder.deleteMany({ user: { $in: ids } }),
    Expense.deleteMany({ user: { $in: ids } }),
    Settings.deleteMany({ user: { $in: ids } }),
    User.deleteMany({ _id: { $in: ids } }),
  ]);
}

async function createUser({ username, email, role = 'user', subscription = null, paymentHistory = [] }) {
  const user = await User.create({
    username,
    email,
    password: PASSWORD,
    role,
    ...(subscription ? { subscription } : {}),
    paymentHistory,
  });

  return {
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

module.exports = async () => {
  await connectDB();
  await cleanupUsers();

  const runId = `${PREFIX}${Date.now()}`;
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const users = {
    runId,
    password: PASSWORD,
    free: await createUser({
      username: `${runId}-free`,
      email: `${runId}-free@example.com`,
    }),
    pro: await createUser({
      username: `${runId}-pro`,
      email: `${runId}-pro@example.com`,
      subscription: {
        plan: 'pro',
        status: 'active',
        billingCycle: 'monthly',
        startDate: new Date(),
        endDate: futureDate,
      },
      paymentHistory: [
        {
          amount: 999,
          plan: 'pro',
          billingCycle: 'monthly',
          date: new Date(),
          endDate: futureDate,
          razorpayOrderId: `order_${runId}`,
          razorpayPaymentId: `payment_${runId}`,
        },
      ],
    }),
    admin: await createUser({
      username: `${runId}-admin`,
      email: `${runId}-admin@example.com`,
      role: 'superadmin',
      subscription: {
        plan: 'pro',
        status: 'active',
        billingCycle: 'monthly',
        startDate: new Date(),
        endDate: futureDate,
      },
    }),
  };

  fs.mkdirSync(TMP_DIR, { recursive: true });
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf8');

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};
