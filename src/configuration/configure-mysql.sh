# This will setup the mariadb/mysql database.
# Made for MariaDB 10.3+, but should work on MySQL versions from 2018 on.
# This expects to be run as a superuser
if [[ $(id -u) -ne 0 ]] ; then echo "Please run using a sudo user, or root. Exiting." ; exit 1 ; fi
# Check if there is a valid install
type mysql >/dev/null 2>&1 && echo "MySQL/MariaDB Installation Found..." || { echo "MySQL/MariaDB Installation Not Found. Exiting." && exit 1; }
# Generate user password
PASS="$(openssl rand -base64 16)"
MAINDB="termtalk"
echo "################################################################"
echo "#                                                              #"
echo "# Generating TermTalk Server Database                          #"
echo "#                                                              #"
echo "# > Host <     : localhost                                     #"
echo "# > Database < : ${MAINDB}                                      #"
echo "# > User <     : ${MAINDB}                                      #"
echo "# > Pass <     : ${PASS}                             #"
echo "#                                                              #"
echo "# Make sure to save this password.                             #"
echo "#                                                              #"
echo "################################################################"
# Do the actual generation
echo "One moment..."
sudo mysql -u root << COMMANDS
CREATE DATABASE $MAINDB;
CREATE USER ${MAINDB}@localhost IDENTIFIED BY '${PASS}';
GRANT ALL PRIVILEGES ON ${MAINDB}.* TO '${MAINDB}'@'localhost';
FLUSH PRIVILEGES;
COMMANDS
# Print out when done
echo "################################################################"
echo "#                                                              #"
echo "# Database Generation Completed!                               #"
echo "# On first launch, or after updates, the tables will           #"
echo "# update (or create) themselves automatically!                 #"
echo "#                                                              #"
echo "################################################################"