import express from "express"
import {claimRewards, getGamer, Initialize, startGame, updateGamer } from "./controller";
import requireAuth from "./middleware";


const gamerRoute = express.Router();

gamerRoute.post('/initialize', Initialize);

gamerRoute.use(requireAuth);
gamerRoute.post('/getGamer', getGamer);
gamerRoute.post('/updateGamer', updateGamer);
gamerRoute.post('/startGame', startGame);
gamerRoute.post('/claimRewards', claimRewards);


export default gamerRoute;