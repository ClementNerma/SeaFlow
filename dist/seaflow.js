/**
 * @file The SeaFlow library
 * @author Clément Nerma
 * @license CC-BY-NC-ND-4.0
 */
// Enable strict mode for more efficiency
"use strict";

/**
 * SeaFlow error class
 * @class
 * @param {Object}
 */
// This particular syntax is needed to make the class a constant
const OError = (function () {
  /**
   * Ace Error class
   * @class
   * @classdesc Custom error class, implementing the native Error methods
   * @private
   */
  class OError extends Error {
    /**
     * The class' constructor
     * @constructor
     * @param {string} message The error message
     * @param {number} code The error code
     * @returns {OError}
     */
    constructor(message, code) {
      // Run the native Error class' constructor
      // This function also defines the `this` constant
      super();
      // Set the error's name...
      this.name = 'OError';
      // ...and its message
      this.message = (typeof code === 'number' ? '(Code: ' + code + ') ' + message : message);
    }
  }

  // Return the class
  return OError;
})();

/**
 * The SeaFlow library
 * @class
 * @classdesc Manage all databases and instanciate them from the disk
 * @constructor
 */
const SeaFlow = new function () {
  /**
   * Does the current environment supports Node.js
   * @type {boolean}
   * @private
   */
  const is_node = (typeof process !== "undefined" && typeof require !== "undefined");

  /**
   * A reference to the 'this' object to be accessed into the 'SeaDB' class
   * @type {SeaFlow}
   * @private
   */
  const that = this;

  /**
   * The DataBase interfacing class
   * @class
   * @private
   * @constructor
   * @classdesc Manage an SeaFlow DataBase
   */
  const SeaDB = function () {
    /**
     * The database's configuration
     * @type {Object}
     * @private
     */
    let config = Object.assign({}, that.dictionnary.DBConfig);

    /**
     * The database's tables
     * @type {Object.<string, Object>}
     * @private
     */
    let tables = {};

    /**
     * The <SeaTable> instances cache
     * @type {Object.<string, SeaTable>}
     * @private
     */
    let tablesCache = {};

    /**
     * Create a table
     * @param {string} name
     * @param {Array.Object} keys
     * @returns {bool|OError} True for success
     */
    this.createTable = (name, keys) => {
      /**
       * A temporary variable to store errors
       * @type {void|OError}
       */
      let err;

      // Check arguments
      if (typeof name !== 'string' || !name.length)
        return new OError('Table name must be a not-empty string', -1);

      if (Array.isArray(name))
        return new OError('An array is expected as the keys', -2);

      // Check if the table's name is reserved
      if (that.dictionnary.reservedNames.includes(name))
        return new OError('This name is a reserved keyword', -3);

      // Check if the table's name is valid
      if (!that.dictionnary.regexp.name.exec(name))
        return new OError('Invalid table name', -12);

      // Check if the table's name is already used
      if (tables.hasOwnProperty(name))
        return new OError('A table with this name already exists', -4);

      // Check keys
      if ((err = that.meta.checkKeyset(keys, config.minimalKeySize, config.maximalKeySize)) !== true)
        return err;

      // -> Create the new table
      // Define a new property into the `tables` object and assign the new keys
      // The 'JSON way' is used here for better performances (see the .export() function for more explanations)
      tables[name] = {
        keys: JSON.parse(JSON.stringify(keys)),
        data: []
      };

      return this.getTable(name);
    };
    
    /**
     * Get a table
     * @param {string} name
     * @returns {OError|SeaTable}
     */
    this.getTable = (name) => {
      // Check the argument
      if (typeof name !== 'string' || !name.length)
        return new OError('Table name must be a not-empty string', -1);

      // Check if the chosen table exists
      if (!tables.hasOwnProperty(name))
        return new OError(`The "${name}" table does not exist`, -18);

      // If the <SeaTable> instance isn't cached...
      if (!tablesCache.hasOwnProperty(name))
        // Instanciate the <SeaTable> class and cache it
        // This way permit to initialize table instances (which takes a bit time and use memory) only when the table
        // is needed by the application. Also, it permit to use only one instance per table, that avoid to have to
        // construct a communication channel between the <SeaTable> instances whenever a table is modified or removed.
        tablesCache[name] = new SeaTable(this, name, tables[name]);

      // Return the instance
      return tablesCache[name];
    };

    /**
     * Delete a table
     * @param {string} name
     * @returns {boolean|OError} True for success
     */
    this.deleteTable = (name) => {
      // Check the argument
      if (typeof name !== 'string' || !name.length)
        return new OError('Table name must be a not-empty string', -1);

      // Check if the chosen table exists
      if (!tables.hasOwnProperty(name))
        return new OError(`The "${name}" table does not exist`, -18);

      // If the table is cached (if it was get at least one time)
      if (tablesCache.hasOwnProperty(name)) {
        // Destroy the instance
        tablesCache[name].__destroy();
        // Remove the instance from the cache
        delete tablesCache[name];
      }

      // Remove the table from the database
      delete tables[name];
      // Success
      return true;
    };

    /**
     * Check if a table exists
     * @param {string} name
     * @returns {boolean|OError}
     */
    this.hasTable = (name) => {
      // Check argument
      if (typeof name !== 'string' || !name.length)
        return new OError('Table name must be a not-empty string', -1);

      // Return the result
      return tables.hasOwnProperty(name);
    };

    /**
     * Export the database
     * @returns {Object}
     */
    this.export = () => {
      // Make the export model
      let db = {
        config: Object.assign({}, config),
        tables: {}
      };

      // For each table...
      for (let table of Reflect.ownKeys(tables)) {
        // Define a new property in the `db` object
        // Clone the `keys` field with the 'JSON way' because it's faster enough with small amount of data
        // NOTE: We need to use a clone because deep arguments can be given to filters for example
        db.tables[table] = {
          keys: JSON.parse(JSON.stringify(tables[table].keys)),
          data: []
        };
        // For each row in the data...
        for (let row of tables[table].data)
        // Clone and push it to the `db` object
        // There are no deep elements other than plain contents (numbers, strings, booleans...) in each row, so we can
        // use the .slice() function to clone the array
          db.tables[table].data.push(row.slice() /* Clone the array by slicing 0 element */ );
      }

      // Return the cloned object
      return db;
    };
  };

  /**
   * The tables interfacing class
   * @class
   * @private
   * @constructor
   * @param {SeaDB} owner The DataBase which owns this table
   * @param {string} name The table's name
   * @param {Object} table The table itself (tables['...'])
   * @param {string} 
   */
  const SeaTable = function(owner, name, table) {
    // The class' inside can access the three properties `owner`, `name` and `table` given by the database
    // This table instance is not available anymore when the table is deleted (matches with a signal sent by the
    // owner <SeaDB> instance)
    
    /**
     * All table's keys
     * @type {Object}
     * @private
     */
    let keys = table.keys;

    /**
     * All data contained in the table
     * @type {Array}
     * @private
     */
    let data = table.data;

    /**
     * The list of all key names
     * @type {Array.string}
     * @private
     */
    let keyNames = [];

    // For each key...
    for (let key of keys)
      // Push its name into the list
      keyNames.push(key.name);

    /**
     * Destroy the instance (reserved to the <SeaDB> class)
     * @returns {void}
     */
    this.__destroy = () => {
      // Remove all properties from this instance
      for (let key of Reflect.ownKeys(this))
        delete this[key];

      // Delete internal variables to free memory
      keys = data = keyNames = null;
    };
    
    /**
     * Insert a new row. See examples to know syntax
     * @param {Object|Array|...*}
     * @example table.insert({ key1: 'value', key2: 'value' })
     * @example table.insert([ 'value', 'value' ])
     * @example table.insert('value', 'value')
     * @returns {boolean|OError} True for success
     */
    this.insert = (...call) => {
      // If many arguments were provided...
      if (call.length > 1)
        // Join them into one single array
        // Call the function with `[ 'value', 'value' ]` is exactly the same than using `'value', 'value'` as them
        call = [call];

      // Get only the first argument
      // NOTE: At this step, there is only ONE element in the array because if there were multiple arguments it was
      //       reduced in the previous `if` block
      call = call[0];

      // First, check the argument
      if (typeof call !== 'object' || !call)
        return new OError('A valid object is expected for the .insert() function', -19);

      // Now the goal is to get one single array which contains all values to insert, in the right order
      // So: if an object was provided...
      if (!Array.isArray(call)) {
        // Make a new object that will contain the final fields
        let put = new Array(keys.length);
        
        // For each given key...
        for (let key of Reflect.ownKeys(call)) {
          // Get the key's index in the table's declaration
          let index = keyNames.indexOf(key);

          // If the table doesn't have this key...
          if (index === -1)
            return new OError(`Unknown key "${key}" at insertion`, -20);

          // Push the value into the `put` array
          put[index] = call[key];
        }

        // Put the data into the `call` object that will be used to insert the data
        call = put;
        // Remove the useless `put` variable to free memory
        put = null;
      }

      // Now, the `call` variable is an array that contains all the values to insert, in the right order
      // If there's too many values in it...
      if (call.length > keys.length)
        return new OError(`${call.length} data were given at insertion, but there are only ${keys.length} keys in the table`, -21);

      // For each given value...
      for (let i = 0; i < call.length; i++) {
        // Get the key that matches with this data index
        let key = keys[i];
        // Get the data to insert
        let value = call[i];
        // Check if the value has a valid format, else convert it to a valid one
        if (typeof value === 'number' || typeof value === 'boolean')
          value = value.toString();
        else if(typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') // Invalid value
          return new OError(`Expecting a string, number or boolean value for key "${key.name}"`, -22);
        
        // Get the type's checker
        let checker = that.dictionnary.regexp['type_' + key.type];
        // Check if the value does not match with the expected type
        if (typeof checker === 'function' ? !checker(value) /* Function */ : !checker.exec(value) /* RegExp */)
          return new OError(`Invalid value given for key "${key.name}", expected type is "${key.type}"`, -23);

        // Get a value that matches with the expected format (special cases)
        if (key.type === 'boolean')
          value = (value === 'true');
        else if(key.type === 'number')
          value = parseFloat(value); // Floating number
        else if(key.type === 'integer')
          value = parseInt(value); // Integer number
      }

      // Push the value into the data collection
      data.push(call);
    };

    /**
     * Get a key's index
     * @param {string} name The key's name
     * @returns {number} -1 is returned in case of error
     */
    this.getKeyIndex = (name) => keyNames.indexOf(name);

    /**
     * Check if a key exists in the table
     * @param {string} name The key's name
     * @returns {boolea} Also returns 'false' in case of error
     */
    this.hasKey = (name) => keyNames.includes(name);

    /**
     * Get all key names
     * @returns {Array}
     */
    this.__defineGetter__('$keys', () => keyNames.slice());
  };

  /**
   * A set of meta functions to check DataBase datas
   * @type {Object.<string, Function>}
   */
  this.meta = {
    /**
     * Check if a set of keys is valid
     * @param {Array.Object} keys
     * @param {number} [minSize] Minimal size for keys
     * @param {number} [maxSize] Maximal size for keys
     * @returns {bool|OError} True for success
     */
    checkKeyset(keys, minSize, maxSize) {
      // Check arguments
      if (!Array.isArray(keys))
        return new OError('An array is expected as the keys', -2);

      // If the `minSize` argument was not given...
      if (typeof minSize === 'undefined')
        minSize = that.dictionnary.DBConfig.minimalKeySize;
      else // Else, check its value
        if (typeof minSize !== 'number' || minSize < 0 || Math.floor(minSize) !== minSize)
          return new OError('Minimal key size must be a positive integer', -14);

      // If the `maxSize` argument was not given...
      if (typeof maxSize !== 'number' || maxSize < 0 || Math.floor(maxSize) !== maxSize)
        maxSize = that.dictionnary.DBConfig.maximalKeySize;
      else // Else, check its value
        if (typeof maxSize !== 'number' || maxSize < 0 || Math.floor(maxSize) !== maxSize)
          return new OError('Maximal key size must be a positive integer', -15);

      // Check if the keys list is empty
      if (!keys.length)
        return new OError('At least one key is needed for tables', -17);

      /**
       * The list of all key names
       * @type {Array.string}
       */
      let keysList = [];

      // For each key...
      for (let key of keys) {
        // Check the type
        if (typeof key !== 'object' || Array.isArray(key) || !key)
          return new OError('An object is expected as the key', -5);

        // -> Check required fields
        // `name`
        if (typeof key.name !== 'string' || !key.name.length)
          return new OError('The key name must be a not-empty string', -10);

        if (!that.dictionnary.regexp.name.exec(key.name))
          return new OError('Invalid key name', -11);

        if (keysList.includes(key.name))
          return new OError(`Key name "${key.name}" is already used`, -16);

        // `type`
        if (typeof key.type === 'undefined')
          return new OError(`Expecting a type for key "${key.name}"`, -13);

        if (!that.dictionnary.types.includes(key.type))
          return new OError(`Unknown type "${key.type}"`, -6);

        // `size`
        if (typeof key.size !== 'number' || key.size < 0 || Math.floor(key.size) !== key.size)
          return new OError('Key size must be a positive integer', -7);

        if (key.size < minSize || key.size > maxSize)
          return new OError(`Key size is outisde range [${minSize}..${maxSize}]`, -8);

        // Check useless properties
        if (Reflect.ownKeys(key).length > 3)
          return new OError('There are useless fields in the key definition', -9);

        // Register this name as a used one
        keysList.push(key.name);
      }

      // The key set is valid
      return true;
    }
  };

  /**
   * The SeaFlow dictionnary
   * @type {Object}
   */
  this.dictionnary = {
    /**
     * The default configuration for databases
     * @type {Object}
     */
    DBConfig: {
      "gz-compression": false,
      "autoflush": true,
      "encoding": "utf-8",
      "minimalKeySize": 2,
      "maximalKeySize": 512
    },

    /**
     * The reserved names for tables names and keys
     * @type {Array.String}
     */
    reservedNames: [
      "__defineGetter__",
      "__defineSetter__",
      "__lookupGetter__",
      "__lookupSetter__",
      "constructor",
      "hasOwnProperty",
      "isPrototypeOf",
      "propertyIsEnumerable",
      "toLocaleString",
      "toString",
      "valueOf"
    ],

    /**
     * The list of all supported types
     * @type {Array.string}
     */
    types: [
      'text',
      'number',
      'boolean',
      'integer',
      'time',
      'date'
    ],

    /**
     * A set of RegExp to check a lot of things
     * @type {Object.<string, RegExp>}
     */
    regexp: {
      // Check if a table or key name is valid
      name: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      // Check if a content matches with a specific type
      type_text: /^.*$/,
      type_number: /^\d+(\.\d+)?$/,
      type_boolean: /^true|false$/,
      type_integer: /^[0-9]+$/,
      type_time: /^(?:([01]?\d|2[0-3]):([0-5]?\d):)?([0-5]?\d)$/,
      // Date only supports '/' or '-' separator. For now it allows bad dates such as '32-05-2016'
      type_date: /^[[0-9]{2}[\/|\-]{1}[0-9]{2}[\/|\-]{1}[0-9]{4}$/
    }
  };

  /**
   * Create a new DataBase
   * @param {string} 
   * @return SeaDB
   */
  this.createDatabase = () => {
    return new SeaDB();
  };
};