const e="# WHERE\n\nThe `WHERE` clause allows you to specify different conditions so that you could filter out the data and get a specific result set.\n\nYou would add the `WHERE` clause after the `FROM` clause.\n\nThe syntax would look like this:\n\n```sql\nSELECT column_name FROM table_name WHERE column=some_value;\n```\n\n## WHERE Clause example\n\nIf we take the example `users` table from the last chapter, let's say that we wanted to get only the active users. The SQL statement would look like this:\n\n```sql\nSELECT DISTINCT username, email, activem FROM users WHERE active=true;\n```\n\nOutput:\n\n```\n+----------+---------------+--------+\n| username | email         | active |\n+----------+---------------+--------+\n| bobby    | b@devdojo.com |      1 |\n| tony     | t@devdojo.com |      1 |\n+----------+---------------+--------+\n```\n\nAs you can see, we are only getting `tony` and `bobby` back as their `active` column is `true` or `1`. If we wanted to get the inactive users, we would have to change the `WHERE` clause and set the `active` to `false`:\n\n```\n+----------+---------------+--------+\n| username | email         | active |\n+----------+---------------+--------+\n| devdojo  | d@devdojo.com |      0 |\n+----------+---------------+--------+\n```\n\nAs another example, let's say that we wanted to select all users with the username `bobby`. The query, in this case, would be:\n\n```sql\nSELECT username, email, active FROM users WHERE username='bobby';\n```\n\nThe output would look like this:\n\n```\n+----------+---------------+--------+\n| username | email         | active |\n+----------+---------------+--------+\n| bobby    | b@devdojo.com |      1 |\n| bobby    | b@devdojo.com |      1 |\n+----------+---------------+--------+\n```\n\nWe are getting 2 entries back as we have 2 users in our database with the username `bobby`.\n\n## Operators\n\nIn the example, we used the `=` operator, which checks if the result set matches the value that we are looking for.\n\nA list of popular operators are:\n\n* `!=` : Not equal operator\n* `>` : Greater than\n* `>=` : Greater than or equal operator\n* `<` : Less than operator\n* `<=` : Less than or equal operator\n\nFor more information about other available operators, make sure to check the official documentation [here](https://dev.mysql.com/doc/refman/8.0/en/non-typed-operators.html).\n\n## AND keyword\n\nIn some cases, you might want to specify multiple criteria. For example, you might want to get all users that are active, and the username matches a specific value. This could be achieved with the `AND` keyword.\n\nSyntax:\n\n```sql\nSELECT * FROM users WHERE username='bobby' AND active=true;\n```\n\nThe result set would contain the data that matches both conditions. In our case, the output would be:\n\n```\n+----+----------+-------+----------+--------+---------------+\n| id | username | about | birthday | active | email         |\n+----+----------+-------+----------+--------+---------------+\n|  2 | bobby    | NULL  | NULL     |      1 | b@devdojo.com |\n|  5 | bobby    | NULL  | NULL     |      1 | b@devdojo.com |\n+----+----------+-------+----------+--------+---------------+\n```\n\nIf we were to change the `AND` statement to `active=false`, we would not get any results back as none of the entries in our database match that condition:\n\n```sql\nSELECT * FROM users WHERE username='bobby' AND active=false;\n```\n```\n-- Output:\nEmpty set (0.01 sec)\n```\n\n## OR keyword\n\nIn some cases, you might want to specify multiple criteria. For example, you might want to get all users that are active, or their username matches a specific value. This could be achieved with the `OR` keyword.\n\nAs with any other programming language, the main difference between `AND` and `OR` is that with `AND`, the result would only return the values that match the two conditions, and with `OR`, you would get a result that matches either of the conditions.\n\nFor example, if we were to run the same query as above but change the `AND` to `OR`, we would get all users that have the username `bobby` and also all users that are not active:\n\n```sql\nSELECT * FROM users WHERE username='bobby' OR active=false;\n```\n\nOutput:\n\n```\n+----+----------+-------+----------+--------+---------------+\n| id | username | about | birthday | active | email         |\n+----+----------+-------+----------+--------+---------------+\n|  2 | bobby    | NULL  | NULL     |      1 | b@devdojo.com |\n|  3 | devdojo  | NULL  | NULL     |      0 | d@devdojo.com |\n|  5 | bobby    | NULL  | NULL     |      1 | b@devdojo.com |\n|  6 | devdojo  | NULL  | NULL     |      0 | d@devdojo.com |\n+----+----------+-------+----------+--------+---------------+\n```\n\n## LIKE operator\n\nUnlike the `=` operator, the `LIKE` operator allows you to do wildcard matching similar to the `*` symbol in Linux.\n\nFor example, if you wanted to get all users that have the `y` letter in them, you would run the following:\n\n```sql\nSELECT * FROM users WHERE username LIKE '%y%';\n```\n\nOutput\n\n```\n+----+----------+-------+----------+--------+---------------+\n| id | username | about | birthday | active | email         |\n+----+----------+-------+----------+--------+---------------+\n|  2 | bobby    | NULL  | NULL     |      1 | b@devdojo.com |\n|  4 | tony     | NULL  | NULL     |      1 | t@devdojo.com |\n+----+----------+-------+----------+--------+---------------+\n```\n\nAs you can see, we are getting only `tony` and `bobby` but not `devdojo` as there is no `y` in `devdojo`.\n\nThis is quite handy when you are building some search functionality for your application.\n\n# IN operator\n\nThe `IN` operator allows you to provide a list expression and would return the results that match that list of values.\n\nFor example, if you wanted to get all users that have the username `bobby` and `devdojo`, you could use the following:\n\n```sql\nSELECT * FROM users WHERE username IN ('bobby', 'devdojo');\n```\n\nOutput:\n\n```\n+----+----------+-------+----------+--------+---------------+\n| id | username | about | birthday | active | email         |\n+----+----------+-------+----------+--------+---------------+\n|  2 | bobby    | NULL  | NULL     |      1 | b@devdojo.com |\n|  3 | devdojo  | NULL  | NULL     |      0 | d@devdojo.com |\n|  5 | bobby    | NULL  | NULL     |      1 | b@devdojo.com |\n|  6 | devdojo  | NULL  | NULL     |      0 | d@devdojo.com |\n+----+----------+-------+----------+--------+---------------+\n```\n\nThis allows you to simplify your `WHERE` expression so that you don't have to add numerous `OR` statements.\n\n## IS operator\n\nIf you were to run `SELECT * FROM users WHERE about=NULL;` you would get an empty result set as the `=` operator can't be used to check for NULL values. Instead, you would need to use the `IS` operator instead.\n\nThe `IS` operator is only used to check `NULL` values, and the syntax is the following:\n\n```sql\nSELECT * FROM users WHERE about IS NULL;\n```\n\nIf you wanted to get the results where the value is not NULL, you just need to change `IS` to `IS NOT`:\n\n\n```sql\nSELECT * FROM users WHERE about IS NOT NULL;\n```\n\n## BETWEEN operator\n\nThe `BETWEEN` operator allows to select value with a given range.The values can be numbers, text, or dates.\nBETWEEN operator is inclusive: begin and end values are included.\n\nFor Example if you want to select those user which have id between 3 and 6.\n\n```sql\nSELECT * FROM users WHERE id BETWEEN 3 AND 6;\n```\n\nOutput:\n\n```\n+----+----------+-------+----------+--------+---------------+\n| id | username | about | birthday | active | email         |\n+----+----------+-------+----------+--------+---------------+\n|  3 | devdojo  | NULL  | NULL     |      0 | d@devdojo.com |\n|  5 | bobby    | NULL  | NULL     |      1 | b@devdojo.com |\n|  6 | devdojo  | NULL  | NULL     |      0 | d@devdojo.com |\n+----+----------+-------+----------+--------+---------------+\n```\n\n## Conclusion\n\nIn this chapter, you've learned how to use the `WHERE` clause with different operators to get different type of results based on the parameters that you provide.\n\nIn the next chapter, we will learn how to order the result set.\n";export{e as default};
//# sourceMappingURL=006-where-CaZwCviA.js.map