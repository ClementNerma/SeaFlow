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
      "encoding": "utf-8"
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
    ]
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