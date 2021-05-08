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
create database if not exists $MAINDB;
create table if not exists banned
(
	id bigint not null,
	timestamp text default current_timestamp() not null,
	reason text default 'Unspecified' null,
	constraint banned_id_uindex
		unique (id)
);

create table if not exists messages
(
	id bigint auto_increment,
	messageHash text not null,
	timestamp text default current_timestamp() not null,
	roomID bigint not null,
	user varchar(64) not null,
	constraint messages_id_uindex
		unique (id)
);

create index if not exists messages_roomID_index
	on messages (roomID);

create table if not exists rooms
(
	name varchar(64) not null,
	passkey text not null,
	topic text default 'Unset' not null,
	created text default current_timestamp() not null,
	id bigint(64) not null,
	constraint rooms_id_uindex
		unique (id)
);

create table if not exists sessions
(
	id bigint not null,
	connectedAt text default current_timestamp() not null,
	failedAttempts int default 0 not null,
	resync text not null,
	constraint sessions_id_uindex
		unique (id)
);

create table if not exists userRooms
(
	roomID bigint not null,
	userID bigint not null,
	timestamp text default current_timestamp() not null
);

create index if not exists userRooms_roomID_index
	on userRooms (roomID);

create index if not exists userRooms_userID_index
	on userRooms (userID);

create table if not exists users
(
	id bigint not null,
	username varchar(64) not null,
	passwordHash text not null,
	tag varchar(10) not null,
	uid varchar(64) not null,
	constraint users_id_uindex
		unique (id),
	constraint users_uid_uindex
		unique (uid)
);



create user ${MAINDB}@localhost identified by '${PASS}';
grant all privileges on ${MAINDB}.* to '${MAINDB}'@'localhost';
flush privileges;
COMMANDS
# Print out when done
echo "################################################################"
echo "#                                                              #"
echo "# Database Generation Completed!                               #"
echo "# On first launch, or after updates, the tables will           #"
echo "# update (or create) themselves automatically!                 #"
echo "#                                                              #"
echo "################################################################"