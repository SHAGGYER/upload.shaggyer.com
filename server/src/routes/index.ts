import express, {Router} from "express";
import path from "path";

import auth from "./auth";

const router = Router();

router.use("/api/auth", auth);
router.use("/", express.static(path.join(__dirname, "../../../client/dist")));

export default router;
