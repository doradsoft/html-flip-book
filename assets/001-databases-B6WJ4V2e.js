const e=`# Databases\r
\r
Before we dive deep into SQL, let's quickly define what a database is.\r
\r
The definition of databases from Wikipedia is:\r
\r
> A database is an organized collection of data, generally stored and accessed electronically from a computer system.\r
\r
In other words, a database is a collection of data stored and structured in different database tables.\r
\r
## Tables and columns\r
\r
You've most likely worked with spreadsheet systems like Excel or Google Sheets. At the very basic, database tables are quite similar to spreadsheets.\r
\r
Each table has different **columns** which could contain different types of data.\r
\r
For example, if you have a todo list app, you would have a database, and in your database, you would have different tables storing different information like:\r
\r
* Users - In the users table, you would have some data for your users like: \`username\`, \`name\`, and \`active\`, for example.\r
* Tasks - The tasks table would store all of the tasks that you are planning to do. The columns of the tasks table would be for example, \`task_name\`, \`status\`, \`due_date\` and \`priority\`.\r
\r
The Users table will look like this:\r
\r
\`\`\`\r
+----+----------+---------------+--------+\r
| id | username | name          | active |\r
+----+----------+---------------+--------+\r
| 1  |    bobby | Bobby Iliev   |   true |\r
| 2  |    grisi | Greisi I.     |   true |\r
| 3  |  devdojo | Dev Dojo      |  false |\r
+----+----------+---------------+--------+\r
\`\`\`\r
\r
Rundown of the table structure:\r
* We have 4 columns: \`id\`, \`username\`, \`name\` and \`active\`.\r
* We also have 3 entries/users.\r
* The \`id\` column is a unique identifier of each user and is auto-incremented.\r
\r
In the next chapter, we will learn how to install MySQL and create our first database.\r
`;export{e as default};
//# sourceMappingURL=001-databases-B6WJ4V2e.js.map
