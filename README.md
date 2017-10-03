# SeaFlow

The SeaFlow library lets you design your own databases on the fly, without installing any proprietary software or big client.
It also lets you make and store your databases on a Node.js server on simply into the browser session or local storage.

# Download

You can download the project [here](https://github.com/ClementNerma/SeaFlow/archive/master.zip).

# Usage

## First way : Node.js

You can use SeaFlow with a Node.js client installed on your machine. Just [download the repository](https://github.com/ClementNerma/SeaFlow/archive/master.zip) and call the module with :

```JavaScript
const seaflow = require('./seaflow.js');
```

Now you're ready to use it !

## Second way : In the browser

Download the library and extract it at your website's root. Then, open your main HTML file and include the file :

```HTML
<script type="text/javascript" src="dist/seaflow.js"></script>
```

# Usage sample

Here is a sample of a simple database management :

```JavaScript
// Create a new SeaFlow database
const db = SeaFlow.createDatabase();

// Create a new table
const table = db.createTable('users', [
  { name: 'id', type: 'number', size: 6 /* 1 million possible users */ },
  { name: 'username', type: 'text', size: 32 },
  { name: 'password', type: 'text', size: 48 /* Ready for SHA-384 strings */ },
  { name: 'email', type: 'text', size: 256 }
]);

// Insert sample data into the database
table.insert({ id: 1, username: 'root', password: 'root', email: 'my.admin@server.root' });
table.insert([ 2, 'admin', 'administrator', 'first.last@domain.ext' ]);
table.insert(3, 'jonas', 'N0tAR0b0t', 'jonas.robot@gmail.com');
table.insert(4, 'jonas', 'N0tAR0b0t', 'first-jonas.robot@gmail.com');

// Perform some sample queries
table.get({ keys: ['username', 'email'], order: ['username:ASC', 'email:DESC'] }); // Display all users' name and email, sorted
```

# Documentation

A documentation and a tutorial will come soon.

# License

~~This project is released under the [Creative Commons Attribution BY-NC-ND 4.0 International](https://creativecommons.org/licenses/by-nc-nd/4.0/) license.
The license of the project may change on the future and it will maybe release using the GPL license in a future version.
See more in the [LICENSE](LICENSE.md) file.

This project is now released under the [GNU GPL license](LICENSE.md) terms.

# Disclaimer

The software is provided "as is" and the author disclaims all warranties
with regard to this software including all implied warranties of
merchantability and fitness. In no event shall the author be liable for
any special, direct, indirect, or consequential damages or any damages
whatsoever resulting from loss of use, data or profits, whether in an action
of contract, negligence or other tortious action, arising out of or in
connection with the use or performance of this software.
