#! /usr/bin/env node
/*
	MIT License

	Copyright (c) 2020 Terminalfreaks

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

// Packages
const Database = require('better-sqlite3')
const fs = require("fs")
const readline = require("readline")
const http = require("http")
const https = require("https")
const FlakeId = require('flakeid')
const flake = new FlakeId({
	timeOffset: (2020 - 1970) * 31536000 * 1000 + (31536000 * 400)
})

// Our files or utils
const Config = require("./config.json")
const Utils = require("./src/Utils.js")
const serverCache = require("./src/serverCache.js")

if(Config.channels.includes("General") || Config.channels.includes("DM")){
	return console.log("General and/or DM channels should't be defined")
}

// Make database directory
if (!fs.existsSync(`${__dirname}/Databases`)) fs.mkdirSync(`${__dirname}/Databases`)

// Constructors
const UserDB = new Database('./Databases/TermTalk_Users.db')
const User = new Utils.UserHandle(UserDB)

// Session setup
Utils.Session.Database = UserDB
setInterval(() => {
	Utils.Session.removeOldSessionsFromDatabase()
}, 1000 * 60 * 5)

// Sessions
const sessions = [{ channel: "General", sessionID: Utils.Session.makeSessionID(), uid: "Server", admin: true }]

// Server
const serverOptions = Config.secure ? {
	key: fs.readFileSync(Config.keyFile, { encoding: "utf8" }),
	ca: fs.readFileSync(Config.chainFile, { encoding: "utf8" }),
	cert: fs.readFileSync(Config.certFile, { encoding: "utf8" })
} : {}
const server = Config.secure ? createServer(https, serverOptions) : createServer(http, serverOptions)
const io = require('socket.io')(server)

if (Config.publicServer) {
	if (["0.0.0.0", "localhost", "127.0.0.1", ""].includes(Config.publicIP)) console.log("Unable to publicly list server because ip is not public.")
	const options = {
		hostname: "www.linkedweb.org",
		path: "/termtalk/addserver",
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		}
	}

	const postData = JSON.stringify({
		ip: Config.publicIP,
		port: Config.port
	})

	const req = https.request(options, res => {
		const status = res.statusCode
		let raw = ""

		res.on("data", (chunk) => raw += chunk)

		res.on("end", () => {
			if (res.statusCode === 200) {
				let data = JSON.parse(raw)

				Config.key = data.key
				fs.writeFileSync("./config.json", JSON.stringify(Config, null, 4))
				console.log("Server added to the server list!")
			} else if (res.statusCode === 422) {
				// should only occur if nginx is being stupid or if params are missing
				console.log("Something went wrong adding your server to the list.")
			} else {
				if (raw !== "Server already listed.") return console.log(raw)
			}
		})
	})

	req.write(postData)
	req.end()
} else if (Config.key) {
	if (["0.0.0.0", "localhost", "127.0.0.1", ""].includes(Config.publicIP)) console.log("Unable to remove publicly listed server because ip is not public.")
	const options = {
		hostname: "www.linkedweb.org",
		path: "/termtalk/removeserver",
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		}
	}

	const postData = JSON.stringify({
		ip: Config.publicIP,
		port: Config.port,
		key: Config.key
	})

	const req = https.request(options, res => {
		const status = res.statusCode
		let raw = ""

		res.on("data", (chunk) => raw += chunk)

		res.on("end", () => {
			if (res.statusCode === 200) {
				console.log(raw)
				delete Config.key
				fs.writeFileSync("./config.json", JSON.stringify(Config, null, 4))
			} else {
				if (raw !== "Server not listed.") return console.log(raw)
			}
		})
	})

	req.write(postData)
	req.end()
}


// Last server message timestamp
let lastServerMessageTime = null

// Load in hardcoded commands
serverCache.addons.connectors.loadCmd()

const ci = readline.createInterface({
	input: process.stdin,
	output: process.stdout
})

io.on("connect", (socket) => {
	socket.removeAllListeners() // Should prevent the reconnect memory leak.
	if (Object.keys(io.sockets.connected).length > Config.maxSlots) {
		socket.emit("methodResult", {
			success: false,
			method: "connect",
			type: "maxSlots",
			message: "The server is currently full. Try again later."
		})
		socket.disconnect(true)
		return;
	}

	console.log("A user has connected.")
	socket.emit("methodResult", {
		success: true,
		method: "connect",
		type: "success",
		message: "Successfully connected."
	})

	socket.emit("getUserData")
	socket.on("returnUserData", (data) => {
		if (data) {
			if (sessions.find(t => t.sessionID == data.sessionID)) return
			if (User.isBanned(data.uid)) return socket.emit("authResult", {
				success: false,
				method: "reconnect",
				type: "userBanned",
				message: "You are banned."
			})
			if (!data || !["uid", "username", "tag", "sessionID", "id"].every((k) => k in data) || [data.uid, data.username, data.tag, data.id].some(str => str === "")) return socket.emit("authResult", {
				success: false,
				method: "reconnect",
				type: "insufficientData",
				message: "The client did not return any or enough data."
			})
			let sessionIndex = serverCache.sessions.findIndex(t => t.sessionID == data.sessionID)
			if (sessionIndex == -1 && !Utils.Session.sessionInDatabase(data.sessionID)) return socket.emit("authResult", {
				success: false,
				method: "reconnect",
				type: "sessionExpired",
				message: "The session id provided was invalid or has expired."
			})
			serverCache.sessions.splice(sessionIndex, 1)[0]
			socket.join("General")
			User.getUserByUID(data.uid, (err, user) => {
				if (err) {
					if (err.type === "userNotExists") {
						socket.emit("methodResult", {
							success: false,
							method: "reconnect",
							...err
						})
					} else {
						socket.emit("methodResult", {
							success: false,
							method: "reconnect",
							type: "serverError",
							message: "The server encountered an error. Be sure to contact the admin."
						})
						console.log(err)
					}
				}
				Utils.Server.broadcast(`${user.bot ? "[BOT] " : ""}${user.username}#${user.tag} has reconnected.`, io, !user.bot ? "General" : null, sessions)
				if (!sessions.find(t => t.sessionID == data.sessionID)) sessions.push({ channel: "General", uid: data.uid, sessionID: data.sessionID, admin: Config.adminUIDs.includes(data.uid), socketID: socket.id, bot: User.isBot(data.uid), id: data.id })
				io.sockets.in("General").emit("method", {
					method: "userConnect",
					type: "serverRequest",
					user: `${data.username}#${data.tag}`
				})
				let bots = sessions.filter(t => t.bot)
				for (let i = 0; i < bots.length; i++) {
					io.sockets.connected[bots[i].socketID].emit('memberConnect', {
						member: {
							username: data.username,
							tag: data.tag,
							id: data.id,
							uid: data.uid,
							bot: User.isBot(data.uid),
							admin: Config.adminUIDs.includes(data.uid)
						}
					})
				}
				let memberList
				try {
					memberList = Utils.Server.getMemberList(sessions, User, "General")
				} catch (e) {
					socket.emit("methodResult", {
						success: false,
						method: "getMemberList",
						type: "serverError",
						message: "The server encountered an error. Be sure to contact the admin."
					})
					return
				}
				socket.emit("methodResult", {
					success: true,
					method: "getMemberList",
					type: "success",
					message: "Successfully received the member list.",
					memberList
				})
			})
			socket.removeAllListeners()
		}
	})
	socket.on("login", (d) => {
		if (Utils.Server.userIsConnected(d.uid, sessions)) return socket.emit("authResult", {
			success: false,
			method: "login",
			type: "userAlreadyConnected",
			message: "You are already connected."
		})
		if (User.isBanned(d.uid)) return socket.emit("authResult", {
			success: false,
			method: "login",
			type: "userBanned",
			message: "You are banned."
		})
		if (!d.bot) {
			User.login(d.uid, d.password, (err, user, matched) => {
				if (err) {
					if (err.type === "userNotExists") {
						return socket.emit("authResult", {
							success: false,
							method: "login",
							...err
						})
					} else {
						return socket.emit("authResult", {
							success: false,
							method: "login",
							type: "serverError",
							message: "The server encountered an error. Be sure to contact the admin."
						})
						console.log(err)
					}
				}
				if (!matched) return socket.emit("authResult", {
					success: false,
					method: "login",
					type: "userCredentialsWrong",
					message: "The user's credentials are wrong."
				})

				let sessionID = Utils.Session.makeSessionID()
				sessions.push({ channel: "General", uid: user.uid, sessionID, admin: Config.adminUIDs.includes(user.uid), socketID: socket.id, id: user.id, bot: false })

				socket.emit("authResult", {
					success: true,
					method: "login",
					type: "success",
					message: "Logged in successfully.",
					user: {
						id: user.id,
						uid: user.uid,
						username: user.username,
						tag: user.tag,
						sessionID
					}
				})

				socket.join("General")
				if (Config.saveLoadHistory) serverCache.addons.connectors.sendHistory(serverCache, io, socket.id, "General")
				Utils.Server.broadcast(`${user.bot ? "[BOT] " : ""}${user.username}#${user.tag} has connected.`, io, "General", sessions)
				io.sockets.in("General").emit("method", {
					method: "userConnect",
					user: `${user.username}#${user.tag}`,
					type: "serverRequest"
				})
				let bots = sessions.filter(t => t.bot)
				for (let i = 0; i < bots.length; i++) {
					io.sockets.connected[bots[i].socketID].emit('memberConnect', {
						member: {
							username: user.username,
							tag: user.tag,
							id: user.id,
							uid: user.uid,
							bot: false,
							admin: Config.adminUIDs.includes(user.uid)
						}
					})
				}
			})
		} else {
			User.loginBot(d.token, (err, bot, matched) => {
				if (err) {
					if (err.type === "botNotExists" || err.type == "userIsNotABot" || err.type == "invalidToken") {
						return socket.emit("authResult", {
							success: false,
							method: "login",
							...err
						})
					} else {
						return socket.emit("authResult", {
							success: false,
							method: "login",
							type: "serverError",
							message: "The server encountered an error. Be sure to contact the admin."
						})
						console.log(err)
					}
				}
				if (bot.passwordHash !== d.token) {
					return socket.emit("authResult", {
						success: false,
						method: "login",
						type: "botCredentialsWrong",
						message: "The bot's credentials are wrong."
					})
				}
				if (!matched) return socket.emit("authResult", {
					success: false,
					method: "login",
					type: "botCredentialsWrong",
					message: "The bot's credentials are wrong."
				})
				let sessionID = Utils.Session.makeSessionID()
				sessions.push({ uid: bot.uid, sessionID, admin: Config.adminUIDs.includes(bot.uid), socketID: socket.id, id: bot.id, bot: true })
				socket.emit("authResult", {
					success: true,
					method: "login",
					type: "success",
					message: "Logged in successfully.",
					bot: {
						id: bot.id,
						uid: bot.uid,
						username: bot.username,
						tag: bot.tag,
						sessionID
					}
				})
				io.emit("method", {
					method: "userConnect",
					user: `${bot.username}#${bot.tag}`,
					type: "serverRequest"
				})
				Utils.Server.broadcast(`[BOT] ${bot.username}#${bot.tag} has connected.`, io, null, sessions)
				let bots = sessions.filter(t => t.bot)
				for (let i = 0; i < bots.length; i++) {
					io.sockets.connected[bots[i].socketID].emit('memberConnect', {
						member: {
							username: bot.username,
							tag: bot.tag,
							id: bot.id,
							uid: bot.uid,
							bot: true,
							admin: Config.adminUIDs.includes(bot.uid)
						}
					})
				}
			})
		}
	})

	socket.on("register", (data) => {
		let { uid, username, tag, password } = data
		uid = uid.trim(), username = username.trim(), tag = tag.trim(), password = password.trim()

		if (!data || !["uid", "username", "tag", "password"].every((k) => k in data) || [uid, username, tag, password].some(str => str === "")) return socket.emit("authResult", {
			success: false,
			method: "register",
			type: "insufficientData",
			message: "The client did not return any or enough data."
		})
		if (tag.length > 4) return socket.emit("authResult", {
			success: false,
			method: "register",
			type: "invalidTag",
			message: "The client provided an invalid tag, or one above 4 characters."
		})

		User.register(uid, username, tag, password, (err, id) => {
			if (err) {
				if (err.type === "userExists") {
					socket.emit("authResult", {
						success: false,
						method: "register",
						...err
					})
					return;
				} else {
					socket.emit("authResult", {
						success: false,
						method: "register",
						type: "serverError",
						message: "The server encountered an error. Be sure to contact the admin."
					})
					console.log(err)
					return;
				}
			}

			let sessionID = Utils.Session.makeSessionID()
			sessions.push({ channel: "General", uid, sessionID, admin: Config.adminUIDs.includes(uid), socketID: socket.id, id, bot: false })

			socket.emit("authResult", {
				success: true,
				method: "register",
				type: "success",
				message: "Registered successfully.",
				user: {
					id,
					uid,
					username,
					tag,
					sessionID
				}
			})
			socket.join("General")
			Utils.Server.broadcast(`${username}#${tag} has connected.`, io, "General", sessions)
			if (Config.saveLoadHistory) serverCache.addons.connectors.sendHistory(serverCache, io, socket.id, "General", sessions)
			io.sockets.in("General").emit("method", {
				method: "userConnect",
				type: "serverRequest",
				user: `${username}#${tag}`
			})
			let bots = sessions.filter(t => t.bot)
			for (let i = 0; i < bots.length; i++) {
				io.sockets.connected[bots[i].socketID].emit('memberConnect', {
					member: {
						username,
						tag,
						id,
						uid,
						bot: false,
						admin: Config.adminUIDs.includes(uid)
					}
				})
			}
		})
	})

	ci.on("line", (input) => {
		if (lastServerMessageTime == Date.now()) return
		lastServerMessageTime = Date.now()
		io.sockets.in(sessions[0].channel).emit("msg", { username: "Server", tag: "0000", msg: input, uid: "Server" })
	})

	socket.on("msg", (data) => {
		if (!data || !["id", "uid", "username", "tag", "msg"].every((k) => k in data) || [data.id, data.uid, data.username, data.tag, data.msg].some(str => str === "")) return socket.emit("methodResult", {
			success: false,
			method: "messageSend",
			type: "insufficientData",
			message: "The client did not return any or enough data."
		})
		if (!data.sessionID || !sessions.find(t => t.sessionID == data.sessionID)) return socket.emit("methodResult", {
			success: false,
			method: "messageSend",
			type: "invalidSessionID",
			message: "The client did not provide any session ID or a valid one, reconnect."
		})

		if ([data.uid, data.username, data.tag, data.msg].some(str => typeof str != "string")) return socket.emit("methodResult", {
			success: false,
			method: "messageSend",
			type: "invalidDataTypes",
			message: "The client did not provide the correct data types in the message."
		})

		let session = sessions.find(t => t.sessionID == data.sessionID && t.uid == data.uid)
		if (session.bot) return socket.emit("methodResult", {
			success: false,
			method: "messageSend",
			type: "userIsBot",
			message: "The user is a bot, use the HTTP requests."
		})

		if (serverCache.addons.hardCommands.has(`${data.msg.slice(1).trim().split(/ +/g)[0]}`) && data.msg.charAt(0) == "/") {
			let cmd = data.msg.slice(1).trim().split(/ +/g)[0]
			let command = null
			if (serverCache.addons.hardCommands.has(cmd)) command = serverCache.addons.hardCommands.get(cmd)
			if (command !== null) {
				if (command.data.permission == "admin" && !session.admin) return Utils.Server.send("You don't have permission to use this.", io, session.socketID)
				command.run({ Utils, User, io, session, sessions, cache: serverCache }, data, data.msg.slice(1).trim().split(/ +/g))
				return
			}
		}
		if (session.lurking) return socket.emit("methodResult", {
			success: false,
			method: "messageSend",
			type: "userIsLurking",
			message: "Client cannot send messages while lurking."
		})
		if (data.uid === "Server") return;
		if (serverCache.addons.connectors.rateLimit(serverCache, io, socket.id, session.channel)) return; // stop if session#channel is ratelimited
		data.msg = Utils.Session.sanitizeInputTags(data.msg)
		if (data.msg.trim().length > Config.maxCharacterLength) return socket.emit("methodResult", {
			success: false,
			method: "messageSend",
			type: "messageTooBig",
			message: `The message the client attempted to send was above ${Config.maxCharacterLength} characters.`
		})
		if (data.msg.trim().length == 0) return socket.emit("methodResult", {
			success: false,
			method: "messageSend",
			type: "noMessageContent",
			message: `The message the client attempted to send had no body.`
		})

		if (serverCache.addons.hardCommands.has(`${data.msg.trim().replace("/", "")}`) && data.msg.trim().charAt(0) == "/") return;
		if (serverCache.addons.chat.locked[session.channel] && !session.admin) return socket.emit("methodResult", {
			success: false,
			method: "messageSend",
			type: "serverLocked",
			message: `The client attempted to send a message while the server was locked.`
		})
		console.log(`${data.username}#${data.tag} ➤ ${data.msg}`)
		//locks the chat except for admins
		if (!serverCache.addons.chat.chatHistory[session.channel]) serverCache.addons.chat.chatHistory[session.channel] = []
		if (serverCache.addons.chat.chatHistory[session.channel].length > 100 && Config.saveLoadHistory) serverCache.addons.chat.chatHistory[session.channel].shift()

		let id = flake.gen()
		if (Config.saveLoadHistory) serverCache.addons.chat.chatHistory[session.channel].push({ id, timestamp: Date.now(), username: data.username, channel: session.channel, tag: data.tag, bot: session.bot, userID: data.id, uid: data.uid, msg: data.msg.replace("\n", "") })
		io.sockets.in(session.channel).emit('msg', { id, bot: session.bot, channel: session.channel, msg: data.msg, username: data.username, tag: data.tag, uid: data.uid, userID: data.id })
		let bots = sessions.filter(t => t.bot)
		for (let i = 0; i < bots.length; i++) {
			io.sockets.connected[bots[i].socketID].emit('msg', { id, bot: session.bot, channel: session.channel, msg: data.msg, username: data.username, tag: data.tag, uid: data.uid, userID: data.id })
		}
	})

	socket.on("disconnecting", () => {
		socket.removeAllListeners()
		let sessionIndex = sessions.findIndex(t => t.socketID == socket.id)
		if (sessionIndex == -1) return console.log("A user has disconnected.")
		let session = sessions.splice(sessionIndex, 1)[0]
		User.getUserByUID(session.uid, (err, d) => {
			if (err) return;
			console.log(`${session.bot ? "[BOT] " : ""}${d.username}#${d.tag} has disconnected.`)
			if (session) {
				if (!session.bot) io.sockets.in(session.channel).emit("method", {
					method: "userDisconnect",
					type: "serverRequest",
					user: `${d.username}#${d.tag}`
				})
				else io.emit("method", {
					method: "userDisconnect",
					type: "serverRequest",
					user: `${d.username}#${d.tag}`
				})

				Utils.Server.broadcast(`${session.bot ? "[BOT] " : ""}${d.username}#${d.tag} has disconnected.`, io, null, sessions)
				let bots = sessions.filter(t => t.bot)
				for (let i = 0; i < bots.length; i++) {
					io.sockets.connected[bots[i].socketID].emit('memberDisconnect', {
						member: {
							username: d.username,
							tag: d.tag,
							id: d.id,
							uid: d.uid,
							bot: session.bot,
							admin: session.admin
						}
					})
				}
				serverCache.sessions.push(session)
				Utils.Session.addSessionToDatabase(session)
				setTimeout(() => {
					let sessionIndex = serverCache.sessions.findIndex(t => t.socketID == socket.id)
					if (sessionIndex != -1) {
						serverCache.sessions.splice(sessionIndex, 1)
					}
				}, 1000 * 60 * 5)
			}
		})
	})

	socket.on("method", (data) => {
		if (data.type != "clientRequest") return

		if (!data || !["uid", "sessionID"].every((k) => k in data)) return socket.emit("methodResult", {
			success: false,
			method: data.method,
			type: "insufficientData",
			message: "The client did not return any or enough data."
		})

		let session = sessions.find(t => t.sessionID == data.sessionID)
		if (!session) return socket.emit("methodResult", {
			success: false,
			method: data.method,
			type: "invalidSessionID",
			message: "The client did not provide any session ID or a valid one, reconnect."
		})

		if (session.bot) return socket.emit("methodResult", {
			success: false,
			method: data.method,
			type: "userIsBot",
			message: "The user is a bot, use the HTTP requests."
		})

		if (data.method == "getMemberList") {
			let memberList;
			try {
				memberList = Utils.Server.getMemberList(sessions, User, data.channel)
			} catch (e) {
				socket.emit("methodResult", {
					success: false,
					method: data.method,
					type: "unableToGetMemberList",
					message: "The server was unable to get the member list."
				})
				return
			}
			socket.emit("methodResult", {
				success: true,
				method: data.method,
				type: "success",
				message: "Successfully received the member list.",
				memberList
			})
		} else if (data.method == "getChannelList") {
			socket.emit("methodResult", {
				success: true,
				method: data.method,
				type: "success",
				message: "Successfully received the channel list.",
				channelList: Config.channels
			})
		}
	})
})

ci.on("SIGINT", () => {
	for (let i = 1; i < sessions.length; i++) {
		Utils.Session.addSessionToDatabase(sessions[i])
	}
	process.exit(0)
})

server.listen(Config.port, () => {
	const userTable = UserDB.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'users';").get()
	const bannedTable = UserDB.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'banned';").get()
	const oldSessionsTable = UserDB.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'oldSessions';").get()

	if (!userTable["count(*)"]) {
		UserDB.prepare("CREATE TABLE users (id INTEGER PRIMARY KEY, uid TEXT, username TEXT, tag TEXT, passwordHash TEXT);").run();
		UserDB.prepare("CREATE UNIQUE INDEX idx_user_id ON users (id);").run()
		UserDB.pragma("synchronous = 1")
		UserDB.pragma("journal_mode = wal")
		console.log("Created SQLite DB and Users table.")
	}

	if (!bannedTable["count(*)"]) {
		UserDB.prepare("CREATE TABLE banned(uid TEXT PRIMARY KEY);").run();
		UserDB.prepare("CREATE UNIQUE INDEX idx_uid ON banned (uid);").run()
		console.log("Created Banned Users table.")
	}

	if (!oldSessionsTable["count(*)"]) {
		UserDB.prepare("CREATE TABLE oldSessions (sessionID TEXT PRIMARY KEY, uid TEXT, expireTime TEXT);").run();
		UserDB.prepare("CREATE UNIQUE INDEX idx_session_id ON oldSessions (sessionID);").run()
		console.log("Created Old Sessions table.")
	}

	let botsColumn = UserDB.prepare("SELECT COUNT(*) AS CNTREC FROM pragma_table_info('users') WHERE name='bot'").get().CNTREC
	if (botsColumn == 0) {
		UserDB.prepare("ALTER TABLE users ADD COLUMN bot BIT;").run()
	}

	let cryptColumn = UserDB.prepare("SELECT COUNT(*) AS CNTREC FROM pragma_table_info('users') WHERE name='crypt'").get().CNTREC
	if (cryptColumn == 0) {
		UserDB.prepare("ALTER TABLE users ADD COLUMN crypt TEXT;").run()
	}

	let ownerColumn = UserDB.prepare("SELECT COUNT(*) AS CNTREC FROM pragma_table_info('users') WHERE name='owner'").get().CNTREC
	if (ownerColumn == 0) {
		UserDB.prepare("ALTER TABLE users ADD COLUMN owner TEXT;").run()
	}

	console.log(`Server online on port ${Config.port}.`)
})

// Making this client side to prevent localiztion stuff
// function getTime(timestamp) {
// 	return `[${new Intl.DateTimeFormat({}, {timeStyle: "short", hour12: true}).format(new Date(timestamp))}]`
// }

function createServer(protocol, serverOptions) {
	return protocol.createServer(serverOptions, (req, res) => {
		req.url = decodeURI(req.url)
		// if(!Config.publicServer || ["0.0.0.0", "localhost", "127.0.0.1"].includes(Config.publicIP)) return res.writeHead(400) // Was thinking maybe pinging should be all servers so I commented this out
		if (req.url == "/ping" && req.method == "GET") {
			let toWrite = JSON.stringify({
				members: Utils.Server.getMemberList(sessions, User).length,
				maxMembers: Config.maxSlots,
				name: Config.serverName,
				port: Config.port,
				ip: Config.publicIP,
				secure: Config.secure
			})
			res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "https://linkedweb.org" })
			res.end(toWrite)
			return
		}
		if (Config.enableAPIEndpoints) {
			if (req.method == "GET") return Utils.API.handleGET(req, res, { Utils, User, io, sessions, cache: serverCache })
			else if (req.method == "POST") return Utils.API.handlePOST(req, res, { Utils, User, io, sessions, cache: serverCache })
		}
	})
}