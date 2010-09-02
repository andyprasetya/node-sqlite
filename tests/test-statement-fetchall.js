sys = require('sys');
fs = require('fs');
path = require('path');

TestSuite = require('async-testing/async_testing').TestSuite;
sqlite = require('sqlite3_bindings');

puts = sys.puts;
inspect = sys.inspect;

var name = "Caching of affectedRows";
var suite = exports[name] = new TestSuite(name);

function createTestTable(db, callback) {
  db.prepare('CREATE TABLE table1 (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, age FLOAT)',
    function (error, createStatement) {
      if (error) throw error;
      createStatement.step(function (error, row) {
        if (error) throw error;
        callback();
      });
    });
}

var tests = [
  { 'insert a row with lastinsertedid':
    function (assert, finished) {
      var self = this;

      self.db.open(':memory:', function (error) {
        function selectStatementPrepared(error, statement) {
          if (error) throw error;
          console.log("Fetchalling");
          statement.fetchAll(function (error, rows) {
            puts("Fetched");
            if (error) throw error;
            puts(inspect(arguments));
            assert.equal(rows.length, 10, "There should be 10 rows");

            rows.forEach(function (i) {
              assert.equal(i.name, 'jonny boy');
              assert.equal(i.age, 23.5);
            });

            self.db.close(function () {
              finished();
            });
          });
        }

        createTestTable(self.db,
          function () {
            function insertRows(db, count, callback) {
              var i = count;
              db.prepare('INSERT INTO table1 (name, age) VALUES ("jonny boy", 23.5)',
                function (error, statement) {
                  statement.step(function (error, row) {
                    if (error) throw error;
                    assert.ok(!row, "Row should be unset");
                    statement.reset();
                    if (--i)
                      statement.step(arguments.callee);
                    else
                      callback();
                  });
                });
            }

            var selectSQL
                = 'SELECT * from table1';

            insertRows(self.db, 10, function () {
              self.db.prepare(selectSQL
                            , selectStatementPrepared);
            });
          });
      });
    }
  }
];

// order matters in our tests
for (var i=0,il=tests.length; i < il; i++) {
  suite.addTests(tests[i]);
}

var currentTest = 0;
var testCount = tests.length;

suite.setup(function(finished, test) {
  this.db = new sqlite.Database();
  finished();
});
suite.teardown(function(finished) {
  if (this.db) this.db.close(function (error) {
                               finished();
                             });
  ++currentTest == testCount;
});

if (module == require.main) {
  suite.runTests();
}