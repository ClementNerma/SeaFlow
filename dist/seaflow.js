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
   * Create a new DataBase
   * @param {string} 
   * @return SeaDB
   */
  this.createDatabase = () => {
    return new SeaDB();
  };
};
