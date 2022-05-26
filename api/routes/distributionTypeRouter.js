const DistributionType = require("../../models/distributionType");
const { ObjectId } = require("mongoose").Types;

module.exports = function (router) {
  router.route("/distributionTypes").get((req, res) => {
    DistributionType.aggregate(
      [
        {
          $sort: {
            name: 1,
          },
        },
        {
          $project: {
            _id: 0,
            id: "$_id",
            name: 1,
          },
        },
      ],
      (err, distributionTypes) => {
        if (err) {
          return res.send(err);
        }
        return res.json(distributionTypes);
      }
    );
  });

  router.route("/distributionTypes/:id").get((req, res) => {
    DistributionType.findById(
      ObjectId(req.params.id),
      (err, distributionType) => {
        if (err) {
          return res.send(err);
        }
        return res.json(distributionType);
      }
    );
  });
};
