import express from "express";
import requireAuth from "../gamerAuth/middleware";
import { 
    createDeal, 
    deleteDeal, 
    getSellerDeals, 
    acceptRequest,
    getUserDeals,
    cancelDeal, 
} from "./controller";

const DealRoutes = express.Router();

// Protected routes (authentication required)
DealRoutes.use(requireAuth);

DealRoutes.post('/create', createDeal);
DealRoutes.post('/acceptRequest', acceptRequest);
DealRoutes.delete('/delete', deleteDeal);
DealRoutes.post('/cancelDeal', cancelDeal);
DealRoutes.post('/user_requests', getSellerDeals);
DealRoutes.post('/user_deals', getUserDeals);

export default DealRoutes;