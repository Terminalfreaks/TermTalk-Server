// placeholder

import TTServer from './src/server/Server.js';
const TermTalk = new TTServer();
TermTalk.Server.listen(TermTalk.Config.port); // in the future, there will be a ready event emitted, and you should wait for that :)