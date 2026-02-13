const Document = require('./../model/documentsModel');
// require('./../utils/catchAsync');
// const APIFeatures = require('./../utils/apiFeatures');
// const fs = require('fs');
// const path = require('path');
// const crypto = require('crypto');
// GET ALL documents
exports.getAllDocument = async (req, res) => {
  try {
    // BUILD QUERY
    // 1A) FILTEREING
    const queryObj = { ...req.query };
    const excludeFields = ['page', 'sort', 'fields', 'limit'];
    excludeFields.forEach((el) => delete queryObj[el]);
    // 1B) ADVANCED FILTERING
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|ge|lte|lt)\b/g, (match) => `$${match}`);
    // console.log(JSON.stringify(queryStr));
    let query = Document.find(JSON.parse(queryStr));
    // 2) sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
      // console.log(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // 3) Fied limiting
    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.fields(fields);
    } else {
      query = query.select('-embeddings');
    }

    // 4) Pagination

    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 100;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    if (req.query.page) {
      const numDocuments = await Document.countDocuments();
      if (skip > numTours) throw new Error('This Page does not exist');
    }
    // EXCUTE QUERY
    const documents = await query;
    // the query have all the methods in the above which is query.sort().filter().sort().limit()
    // const documents =  await Document.find(req.query)
    // const documents = Document.find().where('role').equals('Document').where('plan').equals('free')
    res.status(200).json({
      status: 'success',
      results: documents.length,
      data: {
        documents,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

// GET Document BY ID
exports.getDocument = async (req, res) => {
  try {
    const docum = await Document.findById(req.params.id);
    // Document.findOne({_id: req.param.id}) === Document.findById(req.params.id)
    res.status(200).json({
      status: 'success',
      data: {
        docum,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};
// CREATE Document
exports.createDocument = (req, res) => {
  // const documents = readdocuments();

  // const newDocum = {
  //   _id: crypto.randomUUID(),
  //   ...req.body,
  // };

  // documents.push(newDocum);
  // writedocuments(documents);

  res.status(201).json({
    status: 'success',
    // data: { docum: newDocum },
  });
};

// UPDATE Document
exports.updateDocument = async (req, res) => {
  try {
    const docum = await Document.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      // runValidators: true
    });
    res.status(200).json({
      status: 'success',
      data: {
        docum,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

// DELETE Document
exports.deleteDocument = async (req, res) => {
  try {
    const docum = await Document.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};
