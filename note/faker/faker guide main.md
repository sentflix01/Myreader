Great question! You need a **modular, schema-driven data generator**. Here's how to create a system that:

1. **Reads your existing Mongoose schemas**
2. **Generates data based on those schemas**
3. **Updates relationships automatically**
4. **Allows selective generation**

## **Solution: Create a Schema-Driven Generator**

### **1. Directory Structure:**
```
myreader/
├── models/                    # Your Mongoose schemas
│   ├── User.js
│   ├── Document.js
│   └── ...
├── dev-data/
│   ├── data-generator.js      # Main generator
│   ├── schema-parser.js       # Reads your schemas
│   ├── sample-data/           # Generated data
│   └── config.json           # Configuration
└── package.json
```

### **2. Configuration File (`dev-data/config.json`):**
```json
{
  "defaults": {
    "numUsers": 10,
    "maxDocsPerUser": 8,
    "maxChatsPerUser": 4
  },
  "fieldGenerators": {
    "username": "internet.username",
    "email": "internet.email",
    "password": "internet.password",
    "title": "lorem.words",
    "content": "lorem.paragraphs",
    "name": "person.fullName",
    "filename": "system.fileName",
    "createdAt": "date.past",
    "updatedAt": "date.recent"
  },
  "relationships": {
    "Document.user_id": "User.id",
    "ChatSession.user_id": "User.id",
    "ChatSession.document_id": "Document.id",
    "ChatMessage.chat_session_id": "ChatSession.id",
    "Subscription.user_id": "User.id"
  }
}
```

### **3. Schema Parser (`dev-data/schema-parser.js`):**
```javascript
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

class SchemaParser {
  constructor(modelsPath = '../models') {
    this.modelsPath = path.join(__dirname, modelsPath);
    this.schemas = {};
  }

  // Load all models from models directory
  loadModels() {
    try {
      const modelFiles = fs.readdirSync(this.modelsPath)
        .filter(file => file.endsWith('.js') && file !== 'index.js');

      modelFiles.forEach(file => {
        const modelName = file.replace('.js', '');
        const modelPath = path.join(this.modelsPath, file);
        
        // Clear require cache and require the model
        delete require.cache[require.resolve(modelPath)];
        const modelModule = require(modelPath);
        
        // Extract schema from model
        if (modelModule && modelModule.schema) {
          this.schemas[modelName] = {
            fields: this.extractFields(modelModule.schema),
            model: modelModule
          };
          console.log(`📋 Loaded schema for ${modelName}`);
        }
      });

      return this.schemas;
    } catch (error) {
      console.error('❌ Error loading models:', error.message);
      return {};
    }
  }

  // Extract fields from Mongoose schema
  extractFields(schema) {
    const fields = {};
    const schemaPaths = schema.paths;

    Object.keys(schemaPaths).forEach(pathName => {
      if (pathName === '_id' || pathName === '__v') return;
      
      const schemaType = schemaPaths[pathName];
      const fieldInfo = {
        type: schemaType.instance ? schemaType.instance.toLowerCase() : 'mixed',
        required: schemaType.isRequired || false,
        default: schemaType.defaultValue,
        enum: schemaType.enumValues,
        ref: schemaType.options && schemaType.options.ref
      };

      // Handle embedded schemas
      if (schemaType.schema) {
        fieldInfo.type = 'embedded';
        fieldInfo.fields = this.extractFields(schemaType.schema);
      }

      // Handle arrays
      if (schemaType.$isMongooseArray) {
        fieldInfo.type = 'array';
        fieldInfo.arrayType = schemaType.caster.instance;
      }

      fields[pathName] = fieldInfo;
    });

    return fields;
  }

  // Get schema for a specific model
  getSchema(modelName) {
    return this.schemas[modelName] || null;
  }

  // List all available models
  listModels() {
    return Object.keys(this.schemas);
  }

  // Get field type for a specific model and field
  getFieldType(modelName, fieldName) {
    if (this.schemas[modelName] && this.schemas[modelName].fields[fieldName]) {
      return this.schemas[modelName].fields[fieldName].type;
    }
    return null;
  }
}

module.exports = SchemaParser;
```

### **4. Main Generator (`dev-data/data-generator.js`):**
```javascript
const { faker } = require('@faker-js/faker');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const SchemaParser = require('./schema-parser');

class DataGenerator {
  constructor(options = {}) {
    this.parser = new SchemaParser();
    this.schemas = {};
    this.generatedData = {};
    this.relationships = options.relationships || {};
    this.config = {
      numUsers: options.numUsers || 10,
      maxDocsPerUser: options.maxDocsPerUser || 5,
      ...options
    };
  }

  // Initialize with schemas
  async initialize() {
    this.schemas = this.parser.loadModels();
    console.log(`✅ Loaded ${Object.keys(this.schemas).length} models`);
    return this;
  }

  // Generate data for a specific model
  generateModelData(modelName, count = 1, dependencies = {}) {
    if (!this.schemas[modelName]) {
      throw new Error(`Model ${modelName} not found`);
    }

    const schema = this.schemas[modelName].fields;
    const data = [];

    for (let i = 0; i < count; i++) {
      const record = {};
      
      Object.keys(schema).forEach(fieldName => {
        const field = schema[fieldName];
        
        // Skip _id as MongoDB will generate it
        if (fieldName === '_id') return;
        
        // Handle relationships
        if (this.relationships[`${modelName}.${fieldName}`] && dependencies[fieldName]) {
          record[fieldName] = dependencies[fieldName];
          return;
        }

        // Generate value based on field type
        record[fieldName] = this.generateFieldValue(field, fieldName);
      });

      // Add timestamps if not in schema
      if (!record.createdAt) record.createdAt = faker.date.past();
      if (!record.updatedAt) record.updatedAt = faker.date.recent();

      data.push(record);
    }

    return data;
  }

  // Generate value for a field based on its type
  generateFieldValue(field, fieldName) {
    const { type, required, default: defaultValue, enum: enumValues, ref } = field;

    // Use default value if exists
    if (defaultValue !== undefined && defaultValue !== null) {
      return defaultValue;
    }

    // Handle enum fields
    if (enumValues && enumValues.length > 0) {
      return faker.helpers.arrayElement(enumValues);
    }

    // Handle reference fields (relationships)
    if (ref) {
      // Return a placeholder that will be replaced later
      return `REF:${ref}`;
    }

    // Generate based on field name patterns
    switch (fieldName.toLowerCase()) {
      case 'email':
        return faker.internet.email();
      case 'username':
        return faker.internet.username();
      case 'password':
        return faker.internet.password();
      case 'name':
        return faker.person.fullName();
      case 'title':
        return faker.lorem.words(faker.number.int({ min: 2, max: 8 }));
      case 'content':
      case 'description':
        return faker.lorem.paragraphs(faker.number.int({ min: 1, max: 3 }));
      case 'filename':
        return faker.system.fileName();
      case 'url':
        return faker.internet.url();
      case 'phone':
        return faker.phone.number();
    }

    // Generate based on type
    switch (type) {
      case 'string':
        return faker.lorem.word();
      case 'number':
        return faker.number.int({ min: 0, max: 1000 });
      case 'boolean':
        return faker.datatype.boolean();
      case 'date':
        return faker.date.recent();
      case 'array':
        return [];
      case 'objectid':
        return new mongoose.Types.ObjectId();
      case 'mixed':
        return {};
      default:
        return null;
    }
  }

  // Generate complete dataset with relationships
  generateCompleteDataset() {
    console.log('🚀 Generating complete dataset...');
    
    // Step 1: Generate Users
    this.generatedData.users = this.generateModelData('User', this.config.numUsers);
    console.log(`✅ Generated ${this.generatedData.users.length} users`);
    
    // Step 2: Generate Documents for each user
    this.generatedData.documents = [];
    this.generatedData.users.forEach(user => {
      const userDocs = this.generateModelData('Document', 
        faker.number.int({ min: 1, max: this.config.maxDocsPerUser }),
        { user_id: user._id || user.id }
      );
      this.generatedData.documents.push(...userDocs);
    });
    console.log(`✅ Generated ${this.generatedData.documents.length} documents`);
    
    // Step 3: Generate Chat Sessions
    this.generatedData.chatSessions = [];
    this.generatedData.users.forEach(user => {
      const userChats = this.generateModelData('ChatSession',
        faker.number.int({ min: 1, max: 3 }),
        { 
          user_id: user._id || user.id,
          document_id: faker.helpers.arrayElement(
            this.generatedData.documents.filter(d => d.user_id === user._id || d.user_id === user.id)
          )?._id
        }
      );
      this.generatedData.chatSessions.push(...userChats);
    });
    console.log(`✅ Generated ${this.generatedData.chatSessions.length} chat sessions`);
    
    // Step 4: Generate Subscriptions
    this.generatedData.subscriptions = this.generatedData.users.map(user => {
      return this.generateModelData('Subscription', 1, {
        user_id: user._id || user.id
      })[0];
    });
    console.log(`✅ Generated ${this.generatedData.subscriptions.length} subscriptions`);
    
    return this.generatedData;
  }

  // Generate data for a single model with custom parameters
  generateSingleModel(modelName, count = 1, customParams = {}) {
    console.log(`🎯 Generating ${count} ${modelName} records...`);
    
    let data = this.generateModelData(modelName, count);
    
    // Apply custom parameters
    data = data.map(record => ({
      ...record,
      ...customParams
    }));
    
    // Save to file
    this.saveToFile(modelName, data);
    
    return data;
  }

  // Update existing data (e.g., change username)
  updateData(modelName, findCriteria, updateData) {
    if (!this.generatedData[modelName]) {
      throw new Error(`No data found for model ${modelName}`);
    }

    const updated = this.generatedData[modelName].map(record => {
      // Check if record matches criteria
      const matches = Object.keys(findCriteria).every(key => 
        record[key] === findCriteria[key]
      );
      
      if (matches) {
        return { ...record, ...updateData, updatedAt: new Date() };
      }
      return record;
    });

    this.generatedData[modelName] = updated;
    this.saveToFile(modelName, updated);
    
    console.log(`✅ Updated ${modelName} records matching criteria`);
    return updated;
  }

  // Save data to JSON file
  saveToFile(modelName, data) {
    const outputDir = path.join(__dirname, 'sample-data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, `${modelName.toLowerCase()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    // Also save combined data
    const allDataPath = path.join(outputDir, 'all-data.json');
    if (fs.existsSync(allDataPath)) {
      const allData = JSON.parse(fs.readFileSync(allDataPath, 'utf8'));
      allData[modelName] = data;
      allData.updatedAt = new Date().toISOString();
      fs.writeFileSync(allDataPath, JSON.stringify(allData, null, 2));
    }
    
    console.log(`💾 Saved ${data.length} ${modelName} records to ${filePath}`);
  }

  // Export data for MongoDB seeding
  exportForMongoDB() {
    const output = {};
    
    Object.keys(this.generatedData).forEach(modelName => {
      output[modelName] = this.generatedData[modelName].map(record => ({
        insertOne: {
          document: record
        }
      }));
    });
    
    const filePath = path.join(__dirname, 'sample-data', 'mongo-seed.json');
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
    
    console.log(`📤 Exported MongoDB seed file: ${filePath}`);
    return output;
  }
}

module.exports = DataGenerator;
```

### **5. Command-Line Interface (`dev-data/cli.js`):**
```javascript
#!/usr/bin/env node

const DataGenerator = require('./data-generator');
const { program } = require('commander');
const fs = require('fs');
const path = require('path');

program
  .name('datagen')
  .description('Generate sample data for SentReader AI')
  .version('1.0.0');

// Generate all data
program
  .command('generate-all')
  .description('Generate complete dataset')
  .option('-u, --users <number>', 'Number of users', '10')
  .option('-d, --docs <number>', 'Max documents per user', '5')
  .action(async (options) => {
    const generator = new DataGenerator({
      numUsers: parseInt(options.users),
      maxDocsPerUser: parseInt(options.docs)
    });
    
    await generator.initialize();
    const data = generator.generateCompleteDataset();
    console.log('🎉 Complete dataset generated!');
  });

// Generate single model
program
  .command('generate <model>')
  .description('Generate data for a single model')
  .option('-c, --count <number>', 'Number of records', '5')
  .option('-o, --output <file>', 'Output file')
  .action(async (model, options) => {
    const generator = new DataGenerator();
    await generator.initialize();
    
    const data = generator.generateSingleModel(
      model, 
      parseInt(options.count)
    );
    
    if (options.output) {
      const outputPath = path.join(__dirname, options.output);
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      console.log(`✅ Saved to ${outputPath}`);
    }
  });

// Update existing data
program
  .command('update <model>')
  .description('Update existing data')
  .requiredOption('-f, --field <field>', 'Field to match')
  .requiredOption('-v, --value <value>', 'Value to match')
  .requiredOption('-s, --set <json>', 'Update data as JSON')
  .action(async (model, options) => {
    const generator = new DataGenerator();
    
    // Load existing data
    const dataFile = path.join(__dirname, 'sample-data', `${model.toLowerCase()}.json`);
    if (!fs.existsSync(dataFile)) {
      console.error(`❌ No data found for ${model}`);
      process.exit(1);
    }
    
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    generator.generatedData[model] = data;
    
    const findCriteria = { [options.field]: options.value };
    const updateData = JSON.parse(options.set);
    
    const updated = generator.updateData(model, findCriteria, updateData);
    console.log(`✅ Updated ${updated.length} records`);
  });

// List available models
program
  .command('list-models')
  .description('List all available models')
  .action(async () => {
    const generator = new DataGenerator();
    await generator.initialize();
    
    const models = generator.parser.listModels();
    console.log('📋 Available models:');
    models.forEach(model => {
      const schema = generator.parser.getSchema(model);
      console.log(`  • ${model} (${Object.keys(schema.fields).length} fields)`);
    });
  });

// Export for MongoDB
program
  .command('export-mongo')
  .description('Export data for MongoDB seeding')
  .action(async () => {
    const generator = new DataGenerator();
    
    // Load existing data
    const allDataFile = path.join(__dirname, 'sample-data', 'all-data.json');
    if (!fs.existsSync(allDataFile)) {
      console.error('❌ No data found. Generate data first.');
      process.exit(1);
    }
    
    const allData = JSON.parse(fs.readFileSync(allDataFile, 'utf8'));
    generator.generatedData = allData;
    
    generator.exportForMongoDB();
  });

program.parse();
```

### **6. Usage Examples:**

**Add to package.json scripts:**
```json
"scripts": {
  "generate-data": "node dev-data/cli.js generate-all",
  "generate-users": "node dev-data/cli.js generate User --count 5",
  "update-user": "node dev-data/cli.js update User --field username --value john_doe --set '{\"email\":\"new@email.com\"}'",
  "list-models": "node dev-data/cli.js list-models",
  "export-mongo": "node dev-data/cli.js export-mongo"
}
```

**Run commands:**

```bash
# 1. Generate all data
npm run generate-data

# 2. Generate only users
npm run generate-users

# 3. Update specific user
npm run update-user

# 4. Generate based on your actual schema (if you have models/User.js)
# First, copy your User.js schema to models/ folder
# Then run:
node dev-data/cli.js generate User --count 3

# 5. If you want to update parameters manually:
node dev-data/cli.js update Document --field "metadata.title" --value "Climate Change" --set '{"metadata.pages": 100}'

# 6. Copy-paste your schema and generate:
# Create a file models/MyModel.js with your schema:
# const mongoose = require('mongoose');
# const mySchema = new mongoose.Schema({ ... });
# module.exports = mongoose.model('MyModel', mySchema);
# Then run: node dev-data/cli.js generate MyModel
```

### **7. Quick One-Off Generator for Schema Copy-Paste:**

```javascript
// dev-data/quick-gen.js
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');

// Paste your schema here
const mySchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, min: 18, max: 100 },
  isActive: { type: Boolean, default: true },
  preferences: {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    notifications: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now }
});

function generateFromSchema(schema, count = 5) {
  const data = [];
  
  for (let i = 0; i < count; i++) {
    const record = {};
    
    Object.keys(schema.paths).forEach(path => {
      if (path === '_id' || path === '__v') return;
      
      const schemaType = schema.paths[path];
      
      // Generate based on type
      if (schemaType.instance === 'String') {
        if (schemaType.enumValues) {
          record[path] = faker.helpers.arrayElement(schemaType.enumValues);
        } else if (path.includes('email')) {
          record[path] = faker.internet.email();
        } else if (path.includes('name')) {
          record[path] = faker.person.fullName();
        } else {
          record[path] = faker.lorem.word();
        }
      } else if (schemaType.instance === 'Number') {
        record[path] = faker.number.int({ 
          min: schemaType.minimum || 0, 
          max: schemaType.maximum || 100 
        });
      } else if (schemaType.instance === 'Boolean') {
        record[path] = faker.datatype.boolean();
      } else if (schemaType.instance === 'Date') {
        record[path] = faker.date.past();
      } else if (schemaType.instance === 'ObjectID') {
        record[path] = new mongoose.Types.ObjectId();
      }
    });
    
    data.push(record);
  }
  
  return data;
}

// Generate 5 records
const sampleData = generateFromSchema(mySchema, 5);
console.log(JSON.stringify(sampleData, null, 2));

// Save to file
const fs = require('fs');
fs.writeFileSync('my-generated-data.json', JSON.stringify(sampleData, null, 2));
console.log('\n✅ Saved to my-generated-data.json');
```

## **Key Features:**

1. **Schema-aware**: Reads your actual Mongoose schemas
2. **Relationship-aware**: Maintains foreign key relationships
3. **Selective generation**: Generate individual models or complete datasets
4. **Update capabilities**: Update existing generated data
5. **MongoDB ready**: Export in MongoDB bulk insert format
6. **CLI interface**: Easy to use from command line

This system will automatically adapt when you change your schemas and maintain all relationships correctly!