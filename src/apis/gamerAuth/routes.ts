import express from "express"
import {claimRewards, getGamer, Initialize, login, signUp, startGame, updateGamer } from "./controller";
import requireAuth from "./middleware";


const gamerRoute = express.Router();

gamerRoute.post('/initialize', Initialize);
gamerRoute.post('/auth/signup', signUp);
gamerRoute.post('/auth/login', login);



gamerRoute.use(requireAuth);
gamerRoute.post('/getGamer', getGamer);
gamerRoute.post('/updateGamer', updateGamer);
gamerRoute.post('/startGame', startGame);
gamerRoute.post('/claimRewards', claimRewards);


export default gamerRoute;