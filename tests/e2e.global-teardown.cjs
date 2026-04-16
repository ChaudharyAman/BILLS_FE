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

module.exports = async () => {
  await connectDB();
  await cleanupUsers();

  if (fs.existsSync(USERS_PATH)) {
    fs.unlinkSync(USERS_PATH);
  }

  if (fs.existsSync(TMP_DIR) && fs.readdirSync(TMP_DIR).length === 0) {
    fs.rmdirSync(TMP_DIR);
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};
