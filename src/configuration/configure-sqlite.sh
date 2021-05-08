# This will setup the SQLite 3 database.
# This expects to be run as a superuser
if [[ $(id -u) -ne 0 ]] ; then echo "Please run using a sudo user, or root. Exiting." ; exit 1 ; fi
# Check if there is a valid install
type sqlite3 >/dev/null 2>&1 && echo "sqlite3 Package Found..." || { echo "sqlite3 Package Not Found. Exiting." && exit 1; }
cd ../database/
touch termtalk.db
# Generate
echo "################################################################"
echo "#                                                              #"
echo "# Generating TermTalk Server SQLite Database                   #"
echo "#                                                              #"
echo "################################################################"
# Do the actual generation
echo "One moment..."
sudo sqlite3 termtalk.db << COMMANDS
create table banned
(
    id        integer not null
        unique,
    timestamp text default current_timestamp not null,
    reason    text default 'Unspecified'
);

create table messages
(
    id          integer     not null
        primary key autoincrement
        unique,
    messageHash text        not null,
    timestamp   text default current_timestamp not null,
    roomID      integer     not null,
    user        varchar(64) not null
);

create index idx_messages_messages_roomID_index
    on messages (roomID);

create table rooms
(
    name    varchar(64) not null,
    passkey text        not null,
    topic   text default 'Unset' not null,
    created text default current_timestamp not null,
    id      integer     not null
        unique
);

create table sessions
(
    id             integer not null
        unique,
    connectedAt    text    default current_timestamp not null,
    failedAttempts integer default 0 not null,
    resync         text    not null
);

create table userRooms
(
    roomID    integer not null,
    userID    integer not null,
    timestamp text default current_timestamp not null
);

create index idx_userRooms_userRooms_roomID_index
    on userRooms (roomID);

create index idx_userRooms_userRooms_userID_index
    on userRooms (userID);

create table users
(
    id           integer     not null
        unique,
    username     varchar(64) not null,
    passwordHash text        not null,
    tag          varchar(10) not null,
    uid          varchar(64)
);

create unique index users_uid_uindex
    on users (uid);
COMMANDS
# Print out when done
echo "################################################################"
echo "#                                                              #"
echo "# Database Generation Completed!                               #"
echo "# On first launch, or after updates, the tables will           #"
echo "# update (or create) themselves automatically!                 #"
echo "#                                                              #"
echo "################################################################"