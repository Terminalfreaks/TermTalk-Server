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

const bcrypt = require('bcrypt');
const FlakeId = require('flakeid');
const flake = new FlakeId({
    timeOffset: (2020-1970)*31536000*1000 + (31536000*400)
})

class UserHandle {
	constructor(Database) {
		this.Database = Database;
	}

	register(uid, username, tag, password, callback) {
		if (uid === "Server") return callback({
			type: "invalidUID",
			message: "The UID provided is not allowed to be used."
		})
		if(username == "Server") return callback({
			type: "invalidUsername",
			message: "The username provided is not allowed to be used."
		})
		const user = this.Database.prepare("SELECT * FROM users WHERE uid=?;").get(uid) || this.Database.prepare("SELECT * FROM users WHERE username=? AND tag=?;").get(username, tag)
		if (user) return callback({
			type: "userExists",
			message: "A user with this UID or username/tag combo already exists."
		})
		this._hashPassword(password, (err, hash) => {
			if (err) return callback(err)
				
			const id = flake.gen()
			this.Database.prepare("INSERT INTO users (id, uid, username, tag, passwordHash) VALUES (?, ?, ?, ?, ?);").run(id, uid, username, tag, hash)
			return callback(null, id)
		})
	}

	login(uid, password, callback) {
		const user = this.Database.prepare("SELECT * FROM users WHERE uid=?;").get(uid)
		if (!user) return callback({
			type: "userNotExists",
			message: "This user does not exist."
		})
		bcrypt.compare(password, user.passwordHash, function (err, matched) {
			return err == null ? callback(null, user, matched) : callback(err);
		})
	}

	getUserByUID(uid, callback) {
		const user = this.Database.prepare("SELECT * FROM users WHERE uid=?;").get(uid)
		if (!user) return callback({
			type: "userNotExists",
			message: "This user does not exist."
		})
		return callback(null, user)
	}

	getUser(username, tag, callback) {
		const user = this.Database.prepare("SELECT * FROM users WHERE username=? AND tag=?;").get(username, tag)
		if (!user) return callback({
			type: "userNotExists",
			message: "This user does not exist."
		})
		return callback(null, user)
	}

	ban(uid, callback) {
		const user = this.Database.prepare("SELECT * FROM users WHERE uid=?;").get(uid)
		const banned = this.Database.prepare("SELECT * FROM banned WHERE uid=?;").get(uid)

		if (!user) return callback({
			type: "userNotExists",
			message: "This user does not exist."
		})
		if (banned) return callback({
			type: "userBanned",
			message: "This user is already banned."
		})

		this.Database.prepare("INSERT INTO banned (uid) VALUES (?);").run(uid)
	}

	isBanned(uid) {
		const banned = this.Database.prepare("SELECT * FROM banned WHERE uid=?;").get(uid)
		
		if (banned) return true
		return false
	}

	_hashPassword(password, callback) {
		bcrypt.genSalt(10, function (err, salt) {
			if (err) return callback(err);

			bcrypt.hash(password, salt, (err, hash) => {
				return callback(err, hash);
			});
		});
	}
}

module.exports = UserHandle;