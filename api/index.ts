import express from "express";

const router = express.Router();

import categoryRouter from "./routes/categoryRouter";
import contributorRouter from "./routes/contributorRouter";
import distributionTypeRouter from "./routes/distributionTypeRouter";
import expenseRouter from "./routes/expenseRouter";
import monthRouter from "./routes/monthRouter";

categoryRouter(router);
contributorRouter(router);
distributionTypeRouter(router);
expenseRouter(router);
monthRouter(router);
export default router;
