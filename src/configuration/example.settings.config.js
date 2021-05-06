export default {
    settings: {
        'publicIP': 'localhost',
        'port': '3000',
        'adminUIDs': [
            '',
        ],
        'maxCharacterLength': 1600,
        'allowLurking': false,
        'maxSlots': 20,
        'saveLoadHistory': true,
        'channels': [],
        'messageRatelimit': 1,
        'publicServer': false,
        'serverName': 'TermTalk Server',
        'keyFile': '',
        'chainFile': '',
        'certFile': '',
        'enableAPIEndpoints': true,
        'logLoad': true,
        'database': {
            'SQLite': true,
            'MySQL': false,
        },
        'MySQL': {
            'host': 'localhost',
            'user': 'root',
            'key': process.env.MYSQL_ACCESS_KEY,
            'database': 'TermTalk',
            'waitForConnections': true,
            'connectionLimit': 20,
            'queueLimit': 0,
        },
        'SQLite': {

        },
        'Logger': {
            'logUnknownTypes': false,
        },
    },
};
