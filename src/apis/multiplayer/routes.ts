import express from "express";
import requireAuth from "../gamerAuth/middleware";
import { addPlayerToGame, createGame, deleteGame, getGame, getPendingGameByHost, playGame, updateGameDetails, updatePlayerDetails } from "./controller";

const MultiplayerRoutes = express.Router();

// Protected routes (authentication required)
MultiplayerRoutes.use(requireAuth);

MultiplayerRoutes.post('/create', createGame);
MultiplayerRoutes.delete('/delete', deleteGame);
MultiplayerRoutes.post('/updateplayer', updatePlayerDetails);
MultiplayerRoutes.post('/getGame', getGame); 
MultiplayerRoutes.post('/addPlayer', addPlayerToGame); 
MultiplayerRoutes.post('/hostPendingGames', getPendingGameByHost); 
MultiplayerRoutes.post('/updateGame', updateGameDetails); 
MultiplayerRoutes.post('/playGame', playGame); 
// MultiplayerRoutes.post('/updateGame', acceptRequest);
// MultiplayerRoutes.post('/cancelDeal', cancelDeal);
// MultiplayerRoutes.post('/user_requests', getSellerDeals);
// MultiplayerRoutes.post('/user_deals', getUserDeals);

export default MultiplayerRoutes;