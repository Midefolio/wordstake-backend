import { config as configDotenv } from "dotenv";
import { cleanEnv, port, str } from "envalid"
configDotenv();

const env = cleanEnv(process.env, {
    MONG_URI: str(),
    PORT: port(),
    SECRET:str(),
    GMAIL_USERNAME:str(),
    GMAIL_PASSWORD:str(),
    REDIS_URL:str()
})


export default env;