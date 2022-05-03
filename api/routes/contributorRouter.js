const Contributor = require("../../models/contributor");
const Month = require("../../models/month");
const { isValid } = require("../services/validAmountService")();
const { ObjectId } = require("mongoose").Types;

module.exports = function (router) {
  router.use("/contributors", (req, res, next) => {
    Month.aggregate(
      [
        {
          $sort: {
            _id: -1,
          },
        },
        {
          $limit: 1,
        },
      ],
      (err, month) => {
        if (err) {
          return res.send(err);
        } else if (month) {
          req.lastMonthId = month[0]._id;
          return next();
        }
        const defaultMonth = new Date();
        return res.json(defaultMonth);
      }
    );
  });

  router.route("/contributors").get((req, res) => {
    Contributor.aggregate(
      [
        {
          $unwind: {
            path: "$salaries",
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            salaryId: "$salaries._id",
            amount: "$salaries.amount",
            startDate: "$salaries.startDate",
            endDate: "$salaries.endDate",
            canEditAmount: {
              $gt: ["$startDate", req.lastMonthId],
            },
            canEditStartDate: {
              $gt: ["$startDate", req.lastMonthId],
            },
            canEditEndDate: {
              $or: [
                {
                  endDate: null,
                },
                {
                  $gt: ["$endDate", req.lastMonthId],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: {
              id: "$_id",
              name: "$name",
            },
            salaryHistory: {
              $push: {
                id: "$salaryId",
                amount: "$amount",
                startDate: "$startDate",
                endDate: "$endDate",
                canEditAmount: "$canEditAmount",
                canEditStartDate: "$canEditStartDate",
                canEditEndDate: "$canEditEndDate",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            id: "$_id.id",
            name: "$_id.name",
            salaryHistory: 1,
          },
        },
      ],
      (err, contributors) => {
        if (err) {
          return res.send(err);
        }
        return res.json(contributors);
      }
    );
  });

  router.use("/contributors/:contributorId/salaries", (req, res, next) => {
    if (
      req.body &&
      Object.keys(req.body).length === 0 &&
      Object.getPrototypeOf(req.body) === Object.prototype
    ) {
      return next();
    }
    if (!req.body.amount) {
      res.status(400);
      return res.send("Le montant est requis");
    }
    if (!req.body.startDate) {
      res.status(400);
      return res.send("La date de début de validité est requis");
    }
    const regexFormat = new RegExp("^\\d{4}-\\d{2}$");

    if (!req.body.startDate.match(regexFormat)) {
      res.status(400);
      return res.send("Le format de date est YYYY-MM");
    } else {
      req.body.startDate = new Date(`${req.body.startDate}-01`);
    }

    if (req.body.endDate && !req.body.startDate.match(regexFormat)) {
      res.status(400);
      return res.send("Le format de date est YYYY-MM");
    } else if (req.body.endDate) {
      req.body.startDate = new Date(`${req.body.endDate}-01`);
    }

    Contributor.findById(
      ObjectId(req.params.contributorId),
      (err, contributor) => {
        if (err) {
          return res.send(err);
        } else if (!contributor) {
          res.status(404);
          return res.send("Contributeur introuvable");
        }

        req.contributor = contributor;
        let update = false;
        if (req.method == "PUT") {
          update = true;
          req.body.id = new ObjectId(req.url.substr(1, req.url.length - 1));
        }
        const validationErrors = isValid(
          req.body,
          contributor.salaries,
          req.lastMonthId,
          update
        );
        if (validationErrors) {
          res.status(400);
          return res.send(validationErrors);
        }

        return next();
      }
    );
  });

  function GetSalaries(req, res) {
    Contributor.aggregate(
      [
        {
          $match: {
            _id: new ObjectId(req.params.contributorId),
          },
        },
        {
          $unwind: {
            path: "$salaries",
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            amount: "$salaries.amount",
            salaryId: "$salaries._id",
            startDate: "$salaries.startDate",
            endDate: "$salaries.endDate",
            canEditAmount: {
              $gt: ["$startDate", req.lastMonthId],
            },
            canEditStartDate: {
              $gt: ["$startDate", req.lastMonthId],
            },
            canEditEndDate: {
              $or: [
                {
                  endDate: null,
                },
                {
                  $gt: ["$endDate", req.lastMonthId],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            salaryHistory: {
              $push: {
                id: "$salaryId",
                amount: "$amount",
                startDate: "$startDate",
                endDate: "$endDate",
                canEditAmount: "$canEditAmount",
                canEditStartDate: "$canEditStartDate",
                canEditEndDate: "$canEditEndDate",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            salaryHistory: 1,
          },
        },
      ],
      (err, salaries) => {
        if (err) {
          return res.send(err);
        }
        return res.json(salaries[0].salaryHistory);
      }
    );
  }

  router
    .route("/contributors/:contributorId/salaries")
    .get(GetSalaries)
    .post((req, res) => {
      req.body._id = new ObjectId();
      const salaryToUpdate = req.contributor.salaries.find(
        (s) => s.endDate == null
      );
      if (salaryToUpdate) {
        salaryToUpdate.endDate = req.body.startDate;
        salaryToUpdate.endDate = salaryToUpdate.endDate.setMonth(
          salaryToUpdate.endDate.getMonth() - 1
        );
      }
      req.contributor.salaries.push(req.body);
      req.contributor.save();

      return GetSalaries(req, res);
    });

  router
    .route("/contributors/:contributorId/salaries/:salaryId")
    .get((req, res) => {
      Contributor.aggregate(
        [
          {
            $match: {
              _id: new ObjectId(req.params.contributorId),
            },
          },
          {
            $unwind: {
              path: "$salaries",
            },
          },
          {
            $match: {
              "salaries._id": new ObjectId(req.params.salaryId),
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              amount: "$salaries.amount",
              salaryId: "$salaries._id",
              startDate: "$salaries.startDate",
              endDate: "$salaries.endDate",
              canEditAmount: {
                $gt: ["$startDate", req.lastMonthId],
              },
              canEditStartDate: {
                $gt: ["$startDate", req.lastMonthId],
              },
              canEditEndDate: {
                $or: [
                  {
                    endDate: null,
                  },
                  {
                    $gt: ["$endDate", req.lastMonthId],
                  },
                ],
              },
            },
          },
          {
            $project: {
              _id: 0,
              id: "$salaryId",
              amount: 1,
              startDate: 1,
              endDate: 1,
              canEditAmount: 1,
              canEditStartDate: 1,
              canEditEndDate: 1,
            },
          },
        ],
        (err, salary) => {
          if (err) {
            return res.send(err);
          }
          return res.json(salary[0]);
        }
      );
    })
    .put((req, res) => {
      req.body._id = req.params.salaryId;
      const previousSalaryToUpdate = req.contributor.salaries.find(
        (s) =>
          s.endDate == null &&
          s.startDate < req.body.startDate &&
          s._id != req.params.salaryId
      );
      if (previousSalaryToUpdate) {
        previousSalaryToUpdate.endDate = req.body.startDate;
        previousSalaryToUpdate.endDate = req.body.endDate.setMonth(
          req.body.endDate.getMonth() - 1
        );
      }

      const salaryToUpdate = req.contributor.salaries.find(
        (s) => s._id == req.params.salaryId
      );
      if (salaryToUpdate) {
        salaryToUpdate.amount = req.body.amount;
        salaryToUpdate.startDate = req.body.startDate;
        salaryToUpdate.endDate = req.body.endDate;
      }

      req.contributor.save();

      return GetSalaries(req, res);
    });

  function GetContributor(req, res) {
    Contributor.aggregate(
      [
        {
          $match: {
            _id: new ObjectId(req.params.contributorId),
          },
        },
        {
          $unwind: {
            path: "$salaries",
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            salaryId: "$salaries._id",
            amount: "$salaries.amount",
            startDate: "$salaries.startDate",
            endDate: "$salaries.endDate",
            canEditAmount: {
              $gt: ["$startDate", req.lastMonthId],
            },
            canEditStartDate: {
              $gt: ["$startDate", req.lastMonthId],
            },
            canEditEndDate: {
              $or: [
                {
                  endDate: null,
                },
                {
                  $gt: ["$endDate", req.lastMonthId],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: {
              id: "$_id",
              name: "$name",
            },
            salaryHistory: {
              $push: {
                id: "$salaryId",
                amount: "$amount",
                startDate: "$startDate",
                endDate: "$endDate",
                canEditAmount: "$canEditAmount",
                canEditStartDate: "$canEditStartDate",
                canEditEndDate: "$canEditEndDate",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            id: "$_id.id",
            name: "$_id.name",
            salaryHistory: 1,
          },
        },
      ],
      (err, contributor) => {
        if (err) {
          return res.send(err);
        }
        return res.json(contributor[0]);
      }
    );
  }

  router
    .route("/contributors/:contributorId")
    .get(GetContributor)
    .put((req, res) => {
      Contributor.findByIdAndUpdate(
        ObjectId(req.params.contributorId),
        req.body,
        { new: true },
        (err) => {
          if (err) {
            return res.send(err);
          }
          return GetContributor(req, res);
        }
      );
    });
};
