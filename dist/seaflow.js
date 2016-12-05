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
   * @classdesc Manage an SeaFlow DataBase
   * @constructor
   */
  const SeaDB = function () {
    /**
     * The database's configuration
     * @type {Object}
     */
    let config = Object.assign({}, that.dictionnary.DBConfig);

    /**
     * The database's tables
     * @type {Object}
     */
    let tables = {};

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

      // Check if the chosen table exists...
      if (!tables.hasOwnProperty(name))
        return new OError(`The "${name}" table does not exist`, -18);
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
   * @constructor
   * @param {SeaDB} owner The DataBase which owns this table
   */
  this.SeaTable = (owner) => {
    // TODO: Some stuff here...
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
        if (Reflect.ownKeys(keys).length > 3)
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
      "maximalKeySize": 32
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
      name: /^[a-zA-Z_][a-zA-Z0-9_]*$/
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