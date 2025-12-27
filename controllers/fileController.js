const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataPath = path.join(__dirname, '../dev_data/data/users.json');

// helper functions
const readUsers = () => JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const writeUsers = (users) =>
  fs.writeFileSync(dataPath, JSON.stringify(users, null, 2));

//// get all files
exports.checkBody = (req, res, next) => {
  if (!req.body.name || !req.body.price) {
    return res.status(400).json({
      status: 'fail',
      message: 'Missing name or price',
    });
  }
  next();
};

exports.checkID = (req, res, next, val) => {
  const users = readUsers();
  const exists = users.some((user) => user._id === val);
  console.log(`Tour id is :${val}`);

  if (!exists) {
    return res.status(404).json({
      status: 'fail',
      message: 'User not found',
    });
  }

  next();
};

// GET ALL USERS
exports.getAllFile = (req, res) => {
  const users = readUsers();

  res.status(200).json({
    status: 'success',
    requestedAt: req.requestTime,
    results: users.length,
    data: {
      users,
    },
  });
};

// GET USER BY ID
exports.getFile = (req, res) => {
  const users = readUsers();
  const user = users.find((el) => el._id === req.params.id);

  res.status(200).json({
    status: 'success',
    data: { user },
  });
};

// CREATE USER
exports.createFile = (req, res) => {
  const users = readUsers();

  const newUser = {
    _id: crypto.randomUUID(),
    ...req.body,
  };

  users.push(newUser);
  writeUsers(users);

  res.status(201).json({
    status: 'success',
    data: { user: newUser },
  });
};

// UPDATE USER
exports.updateFile = (req, res) => {
  const users = readUsers();
  const user = users.find((el) => el._id === req.params.id);

  const allowedFields = ['name', 'email', 'role', 'active', 'photo'];

  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {
      user[key] = req.body[key];
    }
  });

  writeUsers(users);

  res.status(200).json({
    status: 'success',
    data: { user },
  });
};

// DELETE USER
exports.deleteFile = (req, res) => {
  const users = readUsers();
  const index = users.findIndex((el) => el._id === req.params.id);

  users.splice(index, 1);
  writeUsers(users);

  res.status(204).json({
    status: 'success',
    data: null,
  });
};
