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
      // ...its message...
      this.message = (typeof code === 'number' ? '(Code: ' + code + ') ' + message : message);
      // ...and also its code (if given)
      if (code)
        this.errcode = code;
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
     * Export the database or a single table
     * @param {string} [table] Export a single table instead of the entire database
     * @returns {Object|OError} Error can only occures when a single table is exported (for bad argument)
     */
    this.export = (table) => {
      // Make the export model
      let db = {
        config: Object.assign({}, config),
        tables: {}
      };

      // If the export targets a specific table...
      if (typeof table !== 'undefined') {
        // Check the argument
        if (typeof table !== 'string' || !table.length)
          return new OError('Table name must be a not-empty string', -1);

        // Check if the chosen table exists
        if (!tables.hasOwnProperty(table))
          return new OError(`The "${table}" table does not exist`, -18);

        // Detailled explanations of this code are written below, in the `for` loop
        // Make a new object with the table's keys
        let ret = {
          keys: JSON.parse(JSON.stringify(tables[table].keys)),
          data: []
        };

        // For each row in the table...
        for (let row of tables[table].data)
          // Push the row to the `ret` object
          ret.data.push(row.slice());

        // Return the table
        return ret;
      }

      // For each table...
      for (let table of Reflect.ownKeys(tables)) {
        // Define a new property in the `db` object
        // Clone the `keys` field with the 'JSON way' because it's faster enough with small amount of data
        // NOTE: The usage of a clone is needed because deep arguments can be given to filters for example
        db.tables[table] = {
          keys: JSON.parse(JSON.stringify(tables[table].keys)),
          data: []
        };

        // For each row in the data...
        for (let row of tables[table].data)
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
    // owner <SeaDB> instance, using the .__destroy() function - see its declaration above -)
    
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
     * @type {Array.<string>}
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
     * Get data from the table
     * @param {Object} what
     * @example table.get({ conditions: { firstname: 'John' } })
     * @example table.get({ keys: ['firstname', 'email'], conditions: [ "firstname^='Jo'", "AND",  "lastname~='N'" ] })
     * @example table.get({ keys: ['firstname'], order: ['firstname:ASC', 'lastname:DESC'] })
     * @example table.get({ method: 'first', where: "firstname=='Jo'" })
     * @example table.get({ method: 'count', limit: 5 })
     * @returns {Array|Object|OError}
     */
    this.get = (what) => {
      // Check the argument
      if (typeof what !== 'object' || Array.isArray(what) || !what)
        return new OError('.get: Argument must be an object', -25);

      // Check the `what` fields
      // NOTE: All fields can have an `undefined` value if their were not specified

      // : Keys to get      
      if (typeof what.keys !== 'undefined' && !Array.isArray(what.keys))
        return new OError('.get: "keys" must be an array', -26);
        
      // For each given key...
      for (let i = 0; i < (what.keys || []).length; i++) {
        // Check its type
        if (typeof what.keys[i] !== 'string')
          return new OError('.get: Each field in "keys" must be a string', -31);

        // Check if the specified key exists
        if (!keyNames.includes(what.keys[i]))
          return new OError(`.get: Table doesn't have a "${what.keys[i]}" key`, -30);

        // Check if the key was already specified before in the array...
        if (what.keys.indexOf(what.keys[i]) !== i)
          return new OError(`.get: Key "${what.keys[i]}" is specified two times in "keys"`, -32);
      }

      // : Order
      // Declare a variable to store the order keys
      let order = [];

      // If an order was specified...
      if (typeof what.order !== 'undefined') {
        // If a string was given...
        if (typeof what.order === 'string')
          what.order = [what.order + ':ASC'];
        else // Else, check if the type is valid
          if (!Array.isArray(what.order))
            return new OError('.get: "order" must be a string or an array', -27);


        // For each key given in the `order` field...
        for (let field of what.order) {
          // Check if it's a string
          if (typeof field !== 'string')
            return new OError('.get: Each field in "order" must be a string', -28);

          // Get the position of the ':' symbol (used to separate the key name and the 'ASC' or 'DESC' keyword)
          let place = field.indexOf(':');

          // If the symbol was not found...
          if (place === -1) {
            // The full string is the key name
            // It uses the 'ASC' method
            // NOTE: The .indexOf() function is used to store the key's index instead of its name. That permit to sort
            //       the output data faster because the .indexOf() function's result is prepared here and not into the
            //       .sort() callback. That permit to save a good time on big data queries.
            order.push([ keyNames.indexOf(field), true /* ASC */ ]);
          } else { // Else, the symbol was found            
            // Check if the method is valid
            // For that, store the order method in a temporary variable
            let ASC = field.substr(place + 1);
            
            // Check the method
            if (ASC !== 'ASC' && ASC !== 'DESC')
              return new OError(`.get: Unsupported "${ASC}" order method, must be "ASC" or "DESC"`, -29);

            // The first part of the string (before the ":" symbol) is the key name
            order.push([ keyNames.indexOf(field.substr(0, place)), ASC === 'ASC' ]);
          }

          // Check if the specified key exists
          if (!keyNames.includes(keyNames[order[order.length - 1][0]]))
            return new OError(`.get: Table doesn't have a "${keyNames[order[order.length - 1][0]]}" key`, -30);
        }
      }

      // : Conditions
      // Declare an object that will contain the conditions
      let where = {
        and: [], // Needed conditions
        or: [], // Groups of conditions where at least one must be true
        not: [] // Conditions that must fail
      };

      // If the `where` field was specified...
      if (typeof what.where !== 'undefined') {
        // Build the conditions object
        where = that.meta.conditionsTree(what.where, keyNames);
        // If an error was thrown...
        if (where instanceof OError)
          // Return it
          return where;
      }

      // : Limit
      // If a limit was specified...
      if (typeof what.limit !== 'undefined') {
        // Check its type
        if (typeof what.limit !== 'number')
          return new OError('.get: "limit" must be a number', -39);

        // Check its value
        // NOTE: Even though they're useless, the '0' and '+/- Infinity' values are allowed
        if (what.limit < 0 || Math.floor(what.limit) !== what.limit)
          return new OError('.get: Limit must be a positive integer', -40);
      }

      // : Method
      // If a method was specified...
      if (typeof what.method !== 'undefined') {
        // Check its type
        if (typeof what.method !== 'string' || !what.method.length)
          return new OError('.get: "method" must be a string', -41);

        // Check if the specified method is supported
        if (!that.dictionnary.getMethods.includes(what.method))
          return new OError(`.get: Unsupported "${what.method}" method`, -42);

        // An order cannot be given with the 'count' method
        if (order.length && what.method === 'count')
          return new OError(`.get: The "count" method is incompatible with the "order" field`, -47);
      }

      // -> Finally, the data's selection can start
      // First, declare a variable which will contain the output
      let output = [];
      // Check if there are conditions to look for
      let thereAreConditions = (what.where && what.where.length);

      // For each row of data...
      for (let row of data) {
        // If the length limit is reached...
        if (output.length === what.limit)
          // Stop the selection
          break ;

        // If there are conditions to look for...
        if (thereAreConditions) {
          // Declare local variables
          // Is there a condition that was not matching with the row ?
          let unsupported = false;
          
          // For each needed condition...
          for (let cond of where.and)
            // If the condition doesn't match with the row...
            if (!this.match(row, cond)) {
              // Set the `unsupported` variable
              unsupported = true;
              // Break the loop
              break ;
            }

          // If a condition failed...
          if (unsupported)
            // Ignore the row
            continue ;

          // For each condition that must NOT match with the row...
          for (let cond of where.not)
            // If the condition matches with the row...
            // NOTE: Here the condition is inverted because the row must be ignored if any condition matches with the row
            if (this.match(row, cond)) {
              // Set the `unsupported` variable
              unsupported = true;
              // Break the loop
              break ;
            }

          // If any condition matched with the row...
          if (unsupported)
            // Ignore it
            continue ;

          // Does any group fails to match with the row ?
          let unmatching = false;
          
          // For each 'or' group...
          for (let group of where.or) {
            // Does any condition match with the row ?
            let match = false;

            // For each condition in the group...
            for (let cond of group)
              // If the condition matches with the row...
              if (this.match(row, cond)) {
                // Set the `match` variable
                match = true;
                // Break the loop
                break ;
              }

            // If every conditions failed...
            if (!match) {
              // Set the `unmatching` variable, to break the `if` block
              unmatching = true;
              // Break this loop
              break ;
            }
          }

          // If any group failed to match with the row...
          if (unmatching)
            // Ignore the row
            continue ;
        }

        // Push the row to the list
        // The row is cloned to prevent table's modification from outside (without data verification)
        output.push(row.slice());
      }

      // Consider chosen the method
      if (what.method === 'first')
        output = [output[0]];
      else if(what.method === 'last')
        output = [output[output.length - 1]];
      else if(what.method === 'count')
        output = output.length;

      // If an order was specified...
      if (order.length)
        // Order the output
        output.sort((a, b) => {
          // For each given comparative way...
          for (let comp of order) {
            // If there is a property higher than the other...
            if (a[comp[0]] !== b[comp[0]])
              // Return this result
              return a[comp[0]] > b[comp[0]] ? (comp[1] ? 1 : -1) : (comp[1] ? -1 : 1);
            // Else, compare with the next property
          }

          // If the code reaches this point, all given properties are equals
          // So the result of the comparison will be arbitrary
          return 0;
        });

      // If not all keys are needed...
      if (what.keys && what.keys.length) {
        // For each row into the `output` array...
        for (let i = 0; i < output.length; i++) {
          // Get the current row
          let row = output[i];
          // Make a new variable that will contain the final row
          let out = [];

          // For each needed key...
          for (let key of what.keys)
            // Push the key's value to the `out` array
            out.push(row[keyNames.indexOf(key)]);

          // Push them to the array
          // NOTE: Because `out` is an all new array, a clone isn't needed because it's not linked to the `data` one
          output[i] = out;
        }
      }

      // Return the `output` variable
      return output;
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
         // If no value was given...
        if (typeof value === 'undefined') {
          // Check if the value is needed
          if (key.required)
            return new OError(`A value is expected for key "${key.name}"`, -49);

          // If the `autoincrement` attribute is set on this key...
          if (key.attributes && key.attributes.includes('autoincrement')) {
            // If there is at least one row in the table...
            if (data.length)
              // Use the last value plus one
              call[i] = data[data.length - 1][i] + 1;
            else // Else...
              call[i] = 1; // Put a first value
          }
        } else { // If a value was given...
          // Check if the value has a valid format, else convert it to a valid one
          if (typeof value === 'number' || typeof value === 'boolean')
            value = value.toString();
          else if(typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') // Invalid value
            return new OError(`Expecting a string, number or boolean value for key "${key.name}"`, -22);
          
          // Check if the content is much longer than the maximum allowed
          if (value.length > key.size)
            return new OError(`Content is too long for key "${key.name}" (${value.length} bytes given, ${key.size} allowed)`, -48);

          // Get the type's checker
          let checker = that.dictionnary.regexp.types[key.type];

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

          // If the key is set as unique...
          if (key.unique)
            // Check if a row contains the same value for this property
            if (data.some((el, index) => el[i] === value))
              return new OError(`Duplicate value: Key "${key.name}" is unique, but value "${value}" was inserted two times`, -9);
        }
      }

      // Push the value into the data collection
      data.push(call);
    };

    /**
     * Check if a row matches with a condition
     * @param {Array} row The row to check
     * @param {Object} cond The condition to use
     * @example table.match([ 'John', 'john.somewhere@domain.com' ], { key: 'username', check: '^=', value: 'Joh' })
     * @returns {boolean|OError}
     */
    this.match = (row, cond) => {
      // Check the arguments
      if (!Array.isArray(row))
        return new OError('Data row must be an array', -43);

      if (typeof cond !== 'object' || Array.isArray(cond) || !cond)
        return new OError('Condition must be an object', -44);

      // Check if fields are missing in the `cond` object
      if (typeof cond.key !== 'string' || typeof cond.check !== 'string' || typeof cond.value !== 'string')
        return new OError('Missing field(s) in the condition object (needs "key", "check" and "value" as strings)', -45);

      // Check if the specified key exists
      if (!keyNames.includes(cond.key))
        return new OError(`Table doesn't have a "${key}" key`, -30);

      // NOTE: There are so much more tests to do, like check all data of the row (type, length...) but that would take
      //       a very long time, so we ignore it. Also, this function is made to be used to be used with a table's
      //       existing row

      // Get the key's value as a string...
      let value = row[keyNames.indexOf(cond.key)].toString();
      // Get the value to compare with
      let comp = cond.value;

      // If they are quotes...
      if ((comp.startsWith('"') && comp.endsWith('"')) || (comp.startsWith("'") && comp.endsWith("'")))
        // Remove them
        comp = comp.substr(1, comp.length - 2);

      // Check if the condition matches with the row, depending of the comparator
      switch (cond.check) {
        case '==': return (value === comp);
        case '!=': return (value === comp);
        case '>' : return (value > comp); // Strings comparison works
        case '<' : return (value < comp);
        case '>=': return (value >= comp);
        case '<=': return (value >= comp);
        case '^=': return value.startsWith(comp);
        case '$=': return value.endsWith(comp);
        case '~=': return value.includes(comp);
        // Unknown comparator
        default: return new OError(`Unknown comparator "${cond.check}"`, -46);
      }
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
     * Export this table
     * @param {boolean} [constructKeys] Returns only data with constructed indexes
     * @returns {Object|Array}
     */
    this.export = (constructKeys = false) => {
      // If keys have to be constructed...
      if (constructKeys) {
        // -> Construct them
        // Make the array that will be returned
        let obj = [];

        // For each row of data...
        for (let row of data) {
          // Make the object that will contain the built row
          let built = {};
          
          // For each value in the row...
          for (let i = 0; i < row.length; i++)
            // Add the value to the built object
            built[keyNames[i]] = row[i];

          // Push the built object to the final array
          obj.push(built);
        }

        // Return the built data array
        return obj;
      }

      // Else, return the exported table
      return owner.export(name);
    };

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
       * @type {Array.<string>}
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

        // `unique` doesn't have any check because it can be any value
        if (typeof key.unique !== 'undefined')
          key.unique = !!key.unique;

        // `attributes`
        // If this field was specified...
        if (typeof key.attributes !== 'undefined') {
          // Check its type
          if (!Array.isArray(key.attributes))
            return new OError(`The key's attributes list must be an array`, -50);

          // For all specified attribute...
          for (let attr of key.attributes)
            // If the attribute is not supported...
            if (!that.dictionnary.keyAttributes.includes(attr))
              return new OError(`Unsupported key attribute "${attr}"`, -51);
        }

        // Register this name as a used one
        keysList.push(key.name);
      }

      // The key set is valid
      return true;
    },

    /**
     * Check if a string value is valid to be inserted into the database
     * @param {string} val The string to check
     * @example ...isValidValue('"hello"')
     * @example ...isValidValue('2.8')
     * @example ...isValidValue('true')
     * @returns {boolean} True if the value is valid, false else
     */
    isValidValue(val) {
      // Check the argument
      if (typeof val !== 'string')
        return false;

      // If it's a string, the value is valid
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        return true;
      
      // Check it it's a number
      if(!Number.isNaN(parseFloat(val)))
        return true;

      // Check if it's a boolean
      if(val === 'true' || val === 'false')
        return true;

      // Else, it's an invalid value
      return false;
    },

    /**
     * Build a conditions tree
     * @param {Array.<string>} conditions The list of all conditions
     * @param {Array.<string>} keys The list of all table's keys
     * @returns {Object.<string, Array>|OError}
     */
    conditionsTree(conditions, keyNames) {
      // Declare an object that will contain the conditions
      let where = {
        and: [], // Needed conditions
        or: [], // Groups of conditions where at least one must be true
        not: [] // Conditions that must fail
      };

      // If a string was given...
      if (typeof conditions === 'string')
        conditions = [conditions];
      else // Else, check if the type is valid
        if (!Array.isArray(conditions))
          return new OError('.get: "where" must be a string or an array', -33);

      // If an empty array was given...
      if (!conditions.length)
        // Return the empty `where` object
        return where;

      // Build a RegExp to use in the loop (see comments above)
      // NOTE: We use the '.' symbol to match any 'comparator' because :
      //  1. That makes the regex faster than if we put all the possible symbols (/...(\^|\$|\!|...).../)
      //  2. That permit to display a beautiful error if the symbol is not valid instead of 'Invalid condition'
      //  3. If an operator is added to the dictionnary's list, the regex will not have to be updated
      let regex = /^([a-zA-Z][a-zA-Z0-9_]*) *(.=|.) *(.*)$/;
      // A boolean to know if an join operator (AND, OR...) is expected or not
      let expectJoin = true;
      // A string that contains the current operator used
      let operator = 'AND';
      // The last operator before the current one. This variable permit to classify the condition in the `where` object
      let lastOperator = 'AND';

      // For each given condition...
      for (let cond of conditions) {
        // Check its type
        if (typeof cond !== 'string')
          return new OError('.get: Each field in "where" must be a string', -34);

        // Revert the 'expectJoin' variable
        expectJoin = !expectJoin;

        // If an operator is expected...
        if (expectJoin) {
          // Save the last used operator
          lastOperator = operator;

          // Check if `expectJoin` is an operator
          if (!that.dictionnary.joinOperators.includes(cond)) {
            // Use the 'AND' operator instead
            operator = 'AND';
            // Reverse the `expectJoin` boolean (because finally we didn't got an operator)
            expectJoin = !expectJoin;
          } else { // Else...
            // Use the given operator
            operator = cond;
            // If the operator is 'OR' and the last is not 'OR'...
            if (operator === 'OR' && lastOperator !== 'OR') {
              // Push a new array into the `where.or` one
              // Also, move the last item from its current place to the last 'OR' array
              where.or.push([ where[lastOperator.toLocaleLowerCase()].splice(-1)[0] ]);
            }
            // Ignore the next instructions that only applies to the conditions
            continue ;
          }
        }

        // Use a regex to match the condition (it's very complicated and slower else)
        // For that, declare a variable that will contain the match
        let match;
        
        // Run the regex
        if (!(match = cond.match(regex)))
          return new OError(`.get: Unsupported condition given "${cond}"`, -35);

        // The regex did the match successfully
        //  match[1] contains the key name
        //  match[2] contains the comparator ('^', '=', '!', ...) without the last '=' symbol
        //  match[3] contains the expected value
        // Store them into local variables
        let key = match[1],
            check = match[2] + (match[2] === '=' ? '=' : ''), // Support for the single "=", which refers to "=="
            value = match[3];

        // Check if the specified key exists
        if (!keyNames.includes(key))
          return new OError(`.get: Table doesn't have a "${key}" key`, -30);

        // Check if the `check` symbol is valid
        if (!that.dictionnary.checkSymbols.includes(check))
          return new OError(`.get: Unsupported comparator "${check}" in condition "${cond}"`, -37);

        // Check if the comparative value is valid
        if (!that.meta.isValidValue(value))
          return new OError(`.get: Invalid comparative value given "${value}" in condition "${cond}"`, -38);

        // Push the condition to the final list, depending of the last operator
        switch (operator) {
          case 'AND':
            where.and.push({ key, check, value });
            break;

          case 'OR':
            where.or[where.or.length - 1].push({ key, check, value });
            break;

          case 'NOT':
            where.not.push({ key, check, value });
            break;
        }
      }

      // The conditions chain can't end with an operator
      // So, if a condition was expected (the boolean is reserved at the beginning of the loop so we inverse it)...
      if (expectJoin)
        return new OError('.get: Missing a condition at the end of the "where" field (can\'t stop after an operator)', -36);
      
      // Return the built conditions object
      return where;
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
      "maximalKeySize": 131072 // (128 Kb)
    },

    /**
     * The reserved names for tables names and keys
     * @type {Array.<string>}
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
     * The list of all supported 'join operators'
     * @type {Array.<string>}
     */
    joinOperators: [
      'AND',
      'OR',
      'NOT'
    ],

    /**
     * The list of all supported comparators
     * @type {Array.<string>}
     */
    checkSymbols: [
      '^=',
      '==',
      '~=',
      '$=',
      '!=',
      '>',
      '<',
      '>=',
      '<='
    ],

    /**
     * The list of all methods that can be use in .get()
     * @type {Array.<string>}
     */
    getMethods: [
      'first',
      'last',
      'count'
    ],

    /**
     * The list of all supported key's attributes
     * @type {Array.<string>}
     */
    keyAttributes: [
      'autoincrement'
    ],

    /**
     * A set of regex to check a lot of things
     * @type {Object.<string, RegExp>}
     */
    regexp: {
      /**
       * A set of regex to check if a content matches with a specific type
       * @type {Object.<string, RegExp>}
       */
      types: {
        text: /^.*$/,
        number: /^\d+(\.\d+)?$/,
        boolean: /^true|false$/,
        integer: /^[0-9]+$/,
        time: /^(?:([01]?\d|2[0-3]):([0-5]?\d):)?([0-5]?\d)$/,
        // Date only supports '/' or '-' separator. For now it allows bad dates such as '32-05-2016'
        date: /^[[0-9]{2}[\/|\-]{1}[0-9]{2}[\/|\-]{1}[0-9]{4}$/
      },

      // Check if a table or key name is valid
      name: /^[a-zA-Z_][a-zA-Z0-9_]*$/
    }
  };

  /**
   * The list of all supported types
   * @type {Array.<string>}
   */
  this.dictionnary.types = Reflect.ownKeys(this.dictionnary.regexp.types);

  /**
   * Create a new DataBase
   * @return SeaDB
   */
  this.createDatabase = () => {
    return new SeaDB();
  };
};

// Node.js support
if (typeof module === 'object' && module /* Avoid 'null' value */)
  module.exports = SeaFlow;
