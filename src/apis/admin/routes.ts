import express from "express"
import { addAdmin, forgotPassword, getAdmin, login, logout, updatePassword } from "./controller";
import requireAuth from "./middleware";

const AdminRoutes = express.Router();

AdminRoutes.post('/login',  login);
AdminRoutes.post('/forgotPassword',  forgotPassword);
AdminRoutes.post('/updatePassword',  updatePassword);



AdminRoutes.post('/addAdmin',  addAdmin);

AdminRoutes.use(requireAuth);
AdminRoutes.get('/getAdmin',  getAdmin);
AdminRoutes.post('/logout', logout);



export default AdminRoutes;