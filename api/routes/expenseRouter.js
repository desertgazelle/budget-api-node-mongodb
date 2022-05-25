const Expense = require("../../models/expense");
const Month = require("../../models/month");
const Category = require("../../models/category");
const DistributionType = require("../../models/distributionType");
const { isValid } = require("../services/validAmountService")();
const { ObjectId } = require("mongoose").Types;
const moment = require("moment");

module.exports = function (router) {
  router.use("/expenses", (req, res, next) => {
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
          console.log(req.lastMonthId);
          return next();
        }
        const defaultMonth = moment.utc().date(1).toDate();
        return res.json(defaultMonth);
      }
    );
  });

  router.use("/expenses", (req, res, next) => {
    if (
      req.url.match(new RegExp("^.*\\/amounts.*$")) ||
      (req.body &&
        Object.keys(req.body).length === 0 &&
        Object.getPrototypeOf(req.body) === Object.prototype)
    ) {
      return next();
    }

    if (!req.body.name) {
      res.status(400);
      return res.send("Le nom est requis");
    }

    Expense.find({ name: req.body.name }, (err, expenses) => {
      if (err) {
        return res.send(err);
      }
      if (
        expenses.length == 0 ||
        (req.params.id &&
          req.sameNameExpenses.length == 1 &&
          req.sameNameExpenses.some((c) => c._id == req.params.id))
      ) {
        return next();
      }
    });

    if (!req.body.categoryId) {
      res.status(400);
      return res.send("La catégorie est requise");
    }

    Category.findById(ObjectId(req.body.categoryId), (err, category) => {
      if (err) {
        return res.send(err);
      }
      if (category.length == 0) {
        res.status(400);
        return res.send("La catégorie est introuvable");
      }
    });

    if (!req.body.distributionTypeId) {
      res.status(400);
      return res.send("La méthode de distribution est requise");
    }

    DistributionType.findById(
      ObjectId(req.body.distributionTypeId),
      (err, distributionType) => {
        if (err) {
          return res.send(err);
        }
        if (distributionType.length == 0) {
          res.status(400);
          return res.send("La méthode de distribution est introuvable");
        }
      }
    );
  });

  router
    .route("/expenses")
    .get((req, res) => {
      Expense.aggregate(
        [
          {
            $unwind: {
              path: "$amounts",
            },
          },
          {
            $sort: {
              "amounts.startDate": -1,
            },
          },
          {
            $lookup: {
              from: "categories",
              localField: "categoryId",
              foreignField: "_id",
              as: "category",
            },
          },
          {
            $unwind: {
              path: "$category",
            },
          },
          {
            $lookup: {
              from: "distributionTypes",
              localField: "distributionTypeId",
              foreignField: "_id",
              as: "distributionType",
            },
          },
          {
            $unwind: {
              path: "$distributionType",
            },
          },
          {
            $project: {
              name: 1,
              categoryId: 1,
              category: {
                name: 1,
              },
              distributionTypeId: 1,
              distributionType: {
                name: 1,
              },
              amountId: "$amounts._id",
              amount: "$amounts.amount",
              startDate: {
                $dateToString: { date: "$amounts.startDate", format: "%Y-%m" },
              },
              endDate: {
                $dateToString: { date: "$amounts.endDate", format: "%Y-%m" },
              },
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
                category: "$category",
                categoryId: "$categoryId",
                distributionType: "$distributionType",
                distributionTypeId: "$distributionTypeId",
              },
              amountHistory: {
                $push: {
                  id: "$amountId",
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
              category: "$_id.category",
              distributionType: "$_id.distributionType",
              categoryId: "$_id.categoryId",
              distributionTypeId: "$_id.distributionTypeId",
              amountHistory: 1,
            },
          },
        ],
        (err, expenses) => {
          if (err) {
            return res.send(err);
          }
          return res.json(expenses);
        }
      );
    })
    .post((req, res) => {
      req.body._id = new ObjectId();
      const expense = new Expense(req.body);
      expense.save();
      res.status(201);
      req.params.expenseId = expense._id;
      return GetExpense(req, res);
    });

  router.use("/expenses/:expenseId/amounts", (req, res, next) => {
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
      req.body.startDate = moment.utc(`${req.body.startDate}-01`).toDate();
    }

    if (req.body.endDate && !req.body.endDate.match(regexFormat)) {
      res.status(400);
      return res.send("Le format de date est YYYY-MM");
    } else if (req.body.endDate) {
      req.body.endDate = moment.utc(`${req.body.endDate}-01`).toDate();
    }

    Expense.findById(ObjectId(req.params.expenseId), (err, expense) => {
      if (err) {
        return res.send(err);
      } else if (!expense) {
        res.status(404);
        return res.send("Dépense introuvable");
      }

      req.expense = expense;
      let update = false;
      if (req.method == "PUT") {
        update = true;
        req.body.id = new ObjectId(req.url.substr(1, req.url.length - 1));
      }
      const validationErrors = isValid(
        req.body,
        expense.amounts,
        req.lastMonthId,
        update
      );
      if (validationErrors) {
        res.status(400);
        return res.send(validationErrors);
      }

      return next();
    });
  });

  function GetAmounts(req, res) {
    Expense.aggregate(
      [
        {
          $match: {
            _id: new ObjectId(req.params.expenseId),
          },
        },
        {
          $unwind: {
            path: "$amounts",
          },
        },
        {
          $sort: {
            "amounts.startDate": -1,
          },
        },
        {
          $project: {
            amountId: {
              $toObjectId: "$amounts._id",
            },
            amount: "$amounts.amount",
            startDate: {
              $dateToString: { date: "$amounts.startDate", format: "%Y-%m" },
            },
            endDate: {
              $dateToString: { date: "$amounts.endDate", format: "%Y-%m" },
            },
            canEditAmount: {
              $gt: ["$startDate", req.lastMonthId],
            },
            canEditStartDate: {
              $gt: ["$startDate", req.lastMonthId],
            },
            canEditEndDate: {
              $or: [
                {
                  $eq: ["$endDate", null],
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
            amountHistory: {
              $push: {
                id: "$amountId",
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
            amountHistory: 1,
          },
        },
      ],
      (err, expense) => {
        if (err) {
          return res.send(err);
        }
        return res.json(expense[0].amountHistory);
      }
    );
  }

  router
    .route("/expenses/:expenseId/amounts/:amountId")
    .get((req, res) => {
      Expense.aggregate(
        [
          {
            $match: {
              _id: new ObjectId(req.params.expenseId),
            },
          },
          {
            $unwind: {
              path: "$amounts",
            },
          },
          {
            $sort: {
              "amounts.startDate": -1,
            },
          },
          {
            $match: {
              "amounts._id": new ObjectId(req.params.amountId),
            },
          },
          {
            $project: {
              _id: 0,
              id: {
                $toObjectId: "$amounts._id",
              },
              amount: "$amounts.amount",
              startDate: {
                $dateToString: { date: "$amounts.startDate", format: "%Y-%m" },
              },
              endDate: {
                $dateToString: { date: "$amounts.endDate", format: "%Y-%m" },
              },
              canEditAmount: {
                $gt: ["$startDate", req.lastMonthId],
              },
              canEditStartDate: {
                $gt: ["$startDate", req.lastMonthId],
              },
              canEditEndDate: {
                $or: [
                  {
                    $eq: ["$endDate", null],
                  },
                  {
                    $gt: ["$endDate", req.lastMonthId],
                  },
                ],
              },
            },
          },
        ],
        (err, expense) => {
          if (err) {
            return res.send(err);
          }
          return res.json(expense[0]);
        }
      );
    })
    .put((req, res) => {
      req.body._id = req.params.amountId;
      const previousAmountToUpdate = req.expense.amounts.find(
        (s) =>
          s.endDate == null &&
          s.startDate < req.body.startDate &&
          s._id != req.params.amountId
      );
      if (previousAmountToUpdate) {
        previousAmountToUpdate.endDate = req.body.startDate;
        previousAmountToUpdate.endDate = req.body.endDate.setMonth(
          req.body.endDate.getMonth() - 1
        );
      }

      const amountToUpdate = req.expense.amounts.find(
        (s) => s._id == req.params.amountId
      );
      if (amountToUpdate) {
        amountToUpdate.amount = req.body.amount;
        amountToUpdate.startDate = req.body.startDate;
        amountToUpdate.endDate = req.body.endDate;
      }

      req.expense.save();

      return GetAmounts(req, res);
    });

  router
    .route("/expenses/:expenseId/amounts")
    .get(GetAmounts)
    .post((req, res) => {
      req.body._id = new ObjectId();
      const amountToUpdate = req.expense.amounts.find((s) => s.endDate == null);
      if (amountToUpdate) {
        amountToUpdate.endDate = req.body.startDate;
        amountToUpdate.endDate = amountToUpdate.endDate.setMonth(
          amountToUpdate.endDate.getMonth() - 1
        );
      }
      req.expense.amounts.push(req.body);
      req.expense.save();

      return GetAmounts(req, res);
    });

  function GetExpense(req, res) {
    Expense.aggregate(
      [
        {
          $match: {
            _id: new ObjectId(req.params.expenseId),
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $unwind: {
            path: "$category",
          },
        },
        {
          $lookup: {
            from: "distributionTypes",
            localField: "distributionTypeId",
            foreignField: "_id",
            as: "distributionType",
          },
        },
        {
          $unwind: {
            path: "$distributionType",
          },
        },
        {
          $unwind: {
            path: "$amounts",
          },
        },
        {
          $sort: {
            "amounts.startDate": -1,
          },
        },
        {
          $project: {
            name: 1,
            categoryId: 1,
            distributionTypeId: 1,
            category: {
              name: 1,
            },
            distributionType: {
              name: 1,
            },
            amountId: {
              $toObjectId: "$amounts._id",
            },
            amount: "$amounts.amount",
            startDate: {
              $dateToString: { date: "$amounts.startDate", format: "%Y-%m" },
            },
            endDate: {
              $dateToString: { date: "$amounts.endDate", format: "%Y-%m" },
            },
            canEditAmount: {
              $gt: ["$startDate", req.lastMonthId],
            },
            canEditStartDate: {
              $gt: ["$startDate", req.lastMonthId],
            },
            canEditEndDate: {
              $or: [
                {
                  $eq: ["$endDate", null],
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
              categoryId: "$categoryId",
              distributionTypeId: "$distributionTypeId",
              category: "$category",
              distributionType: "$distributionType",
            },
            amountHistory: {
              $push: {
                id: "$amountId",
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
            categoryId: "$_id.categoryId",
            distributionTypeId: "$_id.distributionTypeId",
            category: "$_id.category",
            distributionType: "$_id.distributionType",
            amountHistory: 1,
          },
        },
      ],
      (err, expense) => {
        if (err) {
          return res.send(err);
        }
        return res.json(expense[0]);
      }
    );
  }

  router
    .route("/expenses/:expenseId")
    .get(GetExpense)
    .put((req, res) => {
      Expense.findByIdAndUpdate(
        ObjectId(req.params.expenseId),
        { name: req.body.name },
        { new: true },
        (err) => {
          if (err) {
            return res.send(err);
          }
          return GetExpense(req, res);
        }
      );
    });
};
