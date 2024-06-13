const n=`# MySQL\r
\r
Now that you know what a database, table, and column are, the next thing that you would need to do is install a database service where you would be running your SQL queries on.\r
\r
We will be using MySQL as it is free, open-source, and very widely used.\r
\r
## Installing MySQL\r
\r
Depending on your operating system, to install MySQL run the following commands.\r
\r
### Install MySQL on Ubuntu\r
\r
To install MySQL on a Linux or Ubuntu machine, run the following commands:\r
\r
* First update your \`apt\` repository:\r
\r
\`\`\`\r
sudo apt update -y\r
\`\`\`\r
\r
* Then install MySQL:\r
\r
\`\`\`\r
sudo apt install mysql-server mysql-client\r
\`\`\`\r
\r
We are installing two packages, one is the actual MySQL server, and the other is the MySQL client, which would allow us to connect to the MySQL server and run our queries.\r
\r
To check if MySQL is running, run the following command:\r
\r
\`\`\`\r
sudo systemctl status mysql.service\r
\`\`\`\r
To secure your MySQL server, you could run the following command:\r
\r
\`\`\`\r
sudo mysql_secure_installation\r
\`\`\`\r
\r
Then follow the prompt and choose a secure password and save it in a secure place like a password manager.\r
\r
With that, you would have MySQL installed on your Ubuntu server. The above should also work just fine on Debian.\r
\r
### Install MySQL on Mac\r
\r
I would recommend installing MySQL using [Homebrew]():\r
\r
\`\`\`\r
brew install mysql\r
\`\`\`\r
\r
After that, start MySQL:\r
\r
\`\`\`\r
brew services start mysql\r
\`\`\`\r
\r
And finally, secure it:\r
\r
\`\`\`\r
mysql_secure_installation\r
\`\`\`\r
\r
In case that you ever need to stop the MySQL service, you could do so with the following command:\r
\r
\`\`\`\r
brew services stop mysql\r
\`\`\`\r
\r
### Install MySQL on Windows\r
\r
To install MySQL on Windows, I would recommend following the steps from the official documentation here:\r
\r
[https://dev.mysql.com/doc/refman/8.0/en/windows-installation.html](https://dev.mysql.com/doc/refman/8.0/en/windows-installation.html)\r
\r
## Accessing MySQL via CLI\r
\r
To access MySQL run the \`mysql\` command followed by your user:\r
\r
\`\`\`\r
mysql -u root -p\r
\`\`\`\r
\r
## Creating a database\r
\r
After that, switch to the \`demo\` database that we created in the previous chapter:\r
\r
\`\`\`sql\r
USE demo;\r
\`\`\`\r
\r
To exit the just type the following:\r
\r
\`\`\`\r
exit;\r
\`\`\`\r
\r
## Configuring \`.my.cnf\`\r
\r
By configuring the \`~/.my.cnf\` file in your user's home directory, MySQL would allow you to log in without prompting you for a password.\r
\r
To make that change, what you need to do is first create a \`.my.cnf\` file in your user's home directory:\r
\r
\`\`\`\r
touch ~/.my.cnf\r
\`\`\`\r
\r
After that, set secure permissions so that other regular users could not read the file:\r
\r
\`\`\`\r
chmod 600 ~/.my.cnf\r
\`\`\`\r
\r
Then using your favourite text editor, open the file:\r
\r
\`\`\`\r
nano ~/.my.cnf\r
\`\`\`\r
\r
And add the following configuration:\r
\r
\`\`\`\r
[client]\r
user=YOUR_MYSQL_USERNAME\r
password=YOUR_MYSQL_PASSWORD\r
\`\`\`\r
\r
Make sure to update your MySQL credentials accordingly, then save the file and exit.\r
\r
After that, if you run just \`mysql\`, you will be authenticated directly with the credentials that you've specified in the \`~/.my.cnf\` file without being prompted for a password.\r
\r
## The mysqladmin command\r
\r
As a quick test, you could check all of your open SQL connections by running the following command:\r
\r
\`\`\`\r
mysqladmin proc\r
\`\`\`\r
\r
The \`mysqladmin\` tool would also use the client details from the \`~/.my.cnf\` file, and it would list your current MySQL process list.\r
\r
Another cool thing that you could try doing is combining this with the \`watch\` command and kind of monitor your MySQL connections in almost real-time:\r
\r
\`\`\`\r
watch -n1 mysqladmin proc\r
\`\`\`\r
\r
To stop the \`watch\` command, just hit \`CTRL+C\`\r
\r
## GUI clients\r
\r
If you prefer using GUI clients, you could take a look a the following ones and install them locally on your laptop:\r
\r
* [MySQL Workbench](https://www.mysql.com/products/workbench/)\r
* [Sequel Pro](https://www.sequelpro.com/)\r
* [TablePlus](https://tableplus.com/)\r
\r
This will allow you to connect to your database via a graphical interface rather than the \`mysql\` command-line tool.\r
\r
If you want to have a production-ready MySQL database, I would recommend giving DigitalOcean a try:\r
\r
[Worry-free managed database hosting](https://www.digitalocean.com/products/managed-databases/)\r
`;export{n as default};
//# sourceMappingURL=002-install-mysql-BLNXNyEZ.js.map
