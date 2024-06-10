const e="# Basic Syntax\n\nIn this chapter, we will go over the basic SQL syntax.\n\nSQL statements are basically the 'commands' that you run against a specific database. Through the SQL statements, you are telling MySQL what you want it to do, for example, if you wanted to get the `username` of all of your users stored in the `users` table, you would run the following SQL statement:\n\n```sql\nSELECT username FROM users;\n```\n\nRundown of the statement:\n\n* `SELECT`: First, we specify the `SELECT` keyword, which indicates that we want to select some data from the database. Other popular keywords are: `INSERT`, `UPDATE` and `DELETE`.\n* `username`: Then we specify which column we want to select.\n* `FROM users`: After that, we specify the table that we want to select the data from using the `FROM` keyword.\n* The semicolon `;` is highly recommended to put at the end. Standard SQL syntax requires it, but some \"Database Management Systems' (DBMS)\" are tolerant about it, but it's not worth the risk.\n\nIf you run the above statement, you will get no results as the new `users` table that we've just created is empty.\n\n> As a good practice, all SQL keywords should be with uppercase, however, it would work just fine if you use lower case as well.\n\nLet's go ahead and cover the basic operations next.\n\n## INSERT\n\nTo add data to your database, you would use the `INSERT` statement.\n\nLet's use the table that we created in the last chapter and insert 1 user into our `users` table:\n\n```sql\nINSERT INTO users (username, email, active)\nVALUES ('bobby', 'bobby@bobbyiliev.com', true);\n```\n\nRundown of the insert statement:\n\n* `INSERT INTO`: first, we specify the `INSERT INTO` keyword, which tells MySQL that we want to insert data a table.\n* `users (username, email, active)`: then, we specify the table name `users` and the columns that we want to insert data into.\n* `VALUES`: then, we specify the values that we want to insert in. The order of attributes is the same as in `users (...)`.\n\n## SELECT\n\nOnce we've inserted that user, let's go ahead and retrieve the information.\n\nTo retrieve information from your database, you could use the `SELECT` statement:\n\n```sql\nSELECT * FROM users;\n```\n\nOutput:\n\n```\n+----+----------+-------+----------+--------+---------------+\n| id | username | about | birthday | active | email         |\n+----+----------+-------+----------+--------+---------------+\n|  1 | bobby    | NULL  | NULL     |      1 | bobby@b...com |\n+----+----------+-------+----------+--------+---------------+\n```\n\nWe specify `*` right after the `SELECT` keyword, this means that we want to get all of the columns from the `users` table.\n\nIf we wanted to the only the `username` and the `email` columns instead, we would change the statement to:\n\n```sql\nSELECT username, email FROM users;\n```\n\nThis will return all of the users, but as of the time being we have only 1:\n\n```\n+----------+----------------------+\n| username | email                |\n+----------+----------------------+\n| bobby    | bobby@bobbyiliev.com |\n+----------+----------------------+\n```\n\n## UPDATE\n\nIn order to modify data in your database, you could use the `UPDATE` statement.\n\nThe syntax would look like this:\n\n```sql\nUPDATE users SET username='bobbyiliev' WHERE id=1;\n```\n\nRundown of the statement:\n\n* `UPDATE users`: First, we specify the `UPDATE` keyword followed by the table that we want to update.\n* `SET username='bobbyiliev'`: Then we specify the columns that we want to update and the new value that we want to set.\n* `WHERE id=1`: Finally, by using the `WHERE` clause, we specify which user should be updated. In our case it is the user with ID 1.\n\n> NOTE: If we don't specify a `WHERE` clause, all of the entries inside the `users` table would be updated, and all users would have the `username` set to `bobbyiliev`. You need to be careful when you use the `UPDATE` statement without a `WHERE` clause, as every single row will be updated.\n\nWe are going to cover `WHERE` more in-depth in the next few chapters.\n\n## DELETE\n\nAs the name suggests, the `DELETE` statement would remove data from your database.\n\nThe syntax is as follows:\n\n```sql\nDELETE FROM users WHERE id=1;\n```\n\nSimilar to the `UPDATE` statement, if you don't specify a `WHERE` clause, all of the entries from the table will be affected, meaning that all of your users will be deleted.\n\n## Comments\n\nIn case that you are writing a larger SQL script, it might be helpful to add some comments so that later on, when you come back to the script, you would know what each line does.\n\nAs with all programming languages, you can add comments in SQL as well.\n\nThere are two types of comments:\n\n* Inline comments:\n\nTo do so, you just need to add `--` before the text that you want to comment out:\n\n```sql\nSELECT * FROM users; -- Get all users\n```\n\n* Multiple-line comments:\n\nSimilar to some other programming languages in order to comment multiple lines, you could wrap the text in `/*` `*/` as follows:\n\n```sql\n/*\nGet all of the users\nfrom your database\n*/\nSELECT * FROM users;\n```\n\nYou could write that in a `.sql` file and then run it later on, or execute the few lines directly.\n\n## Conclusion\n\nThose were some of the most common basic SQL statements.\n\nIn the next chapters, we are going to go over each of the above statements more in-depth.\n";export{e as default};
//# sourceMappingURL=004-basic-syntax-B6anHhZx.js.map
