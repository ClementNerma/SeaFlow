/**
 * @file The SeaFlow library
 * @author Clément Nerma
 * @license CC-BY-NC-ND-4.0
 */
// Enable strict mode for more efficiency
"use strict";

/**
 * The SeaFlow library
 * @class
 * @classdesc Manage all databases and instanciate them from the disk
 * @constructor
 */
const SeaFlow = new function() {
  /**
   * Does the current environment supports Node.js
   * @type {boolean}
   */
  const is_node = (typeof process !== 'undefined' && typeof require !== 'undefined');

  /**
   * The DataBase interfacing class
   * @class
   * @classdesc Manage an SeaFlow DataBase
   * @constructor
   */
  const SeaDB = function() {
    // TODO: Do some stuff here...
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
      "reserveKeywords": []
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
