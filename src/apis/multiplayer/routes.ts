import express from "express";
import requireAuth from "../gamerAuth/middleware";
import { createGame, deleteGame, updatePlayerDetails } from "./controller";

const MultiplayerRoutes = express.Router();

// Protected routes (authentication required)
MultiplayerRoutes.use(requireAuth);

MultiplayerRoutes.post('/create', createGame);
MultiplayerRoutes.delete('/delete', deleteGame);
MultiplayerRoutes.post('/updateplayer', updatePlayerDetails);
// MultiplayerRoutes.post('/updateGame', acceptRequest);
// MultiplayerRoutes.post('/cancelDeal', cancelDeal);
// MultiplayerRoutes.post('/user_requests', getSellerDeals);
// MultiplayerRoutes.post('/user_deals', getUserDeals);

export default MultiplayerRoutes;