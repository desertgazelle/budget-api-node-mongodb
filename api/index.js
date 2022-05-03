const express = require("express");

const router = express.Router();

require("./routes/categoryRouter")(router);
require("./routes/contributorRouter")(router);
require("./routes/distributionTypeRouter")(router);
require("./routes/expenseRouter")(router);
require("./routes/monthRouter")(router);

module.exports = router;
