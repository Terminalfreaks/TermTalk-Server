import dotenv from 'dotenv';
export default function loadEnv(Server) {
    try {
        dotenv.config();
        if (Server.Config.database.MySQL) Server.Config.MySQL.password = process.env.MYSQL_ACCESS_KEY;
    } catch (error) {
        Server.Log.exit(error);
    } finally {
        Server.Log.write('Loaded Environment Variables');
    }
}