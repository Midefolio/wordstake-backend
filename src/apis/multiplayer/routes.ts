import express from "express";
import requireAuth from "../gamerAuth/middleware";
import { createGame } from "./controller";

const MultiplayerRoutes = express.Router();

// Protected routes (authentication required)
MultiplayerRoutes.use(requireAuth);

MultiplayerRoutes.post('/create', createGame);
// MultiplayerRoutes.post('/updateGame', acceptRequest);
// MultiplayerRoutes.delete('/delete', deleteDeal);
// MultiplayerRoutes.post('/cancelDeal', cancelDeal);
// MultiplayerRoutes.post('/user_requests', getSellerDeals);
// MultiplayerRoutes.post('/user_deals', getUserDeals);

export default MultiplayerRoutes;