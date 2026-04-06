class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString || {};
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // 1B) Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    try {
      this.query = this.query.find(JSON.parse(queryStr));
    } catch (error) {
      // If JSON parsing fails, use empty filter
      this.query = this.query.find({});
    }

    return this;
  }

  sort() {
    if (this.queryString.sort && typeof this.queryString.sort === 'string') {
      // Validate sort fields to prevent injection
      const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'originalFileName', 'fileSize', 'status'];
      const sortFields = this.queryString.sort.split(',');
      const validSortFields = sortFields.filter(field => {
        const cleanField = field.replace(/^-/, ''); // Remove descending prefix
        return allowedSortFields.includes(cleanField);
      });
      
      if (validSortFields.length > 0) {
        const sortBy = validSortFields.join(' ');
        this.query = this.query.sort(sortBy);
      } else {
        this.query = this.query.sort('-createdAt');
      }
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields && typeof this.queryString.fields === 'string') {
      // Validate field names to prevent injection
      const allowedFields = [
        'originalFileName', 'fileType', 'fileSize', 'status', 'createdAt', 'updatedAt',
        'extractedText', 'textLength', 'wordCount', 'metadata', 'tags', 'isPublic'
      ];
      const requestedFields = this.queryString.fields.split(',');
      const validFields = requestedFields.filter(field => 
        allowedFields.includes(field.trim()) || field.trim().startsWith('-')
      );
      
      if (validFields.length > 0) {
        const fields = validFields.join(' ');
        this.query = this.query.select(fields);
      } else {
        this.query = this.query.select('-__v -embeddings');
      }
    } else {
      this.query = this.query.select('-__v -embeddings');
    }

    return this;
  }

  paginate() {
    const page = Math.max(1, parseInt(this.queryString.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(this.queryString.limit) || 20));
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}
module.exports = APIFeatures;
