import Expense, { IAmount, IExpense } from "../../models/expense";
import Month, { IMonth } from "../../models/month";
import Category, { ICategory } from "../../models/category";
import DistributionType, {
  IDistributionType,
} from "../../models/distributionType";
import validAmountService from "../services/validAmountService";
import mongoose from "mongoose";
import { Router, Request, Response, NextFunction } from "express";
import moment from "moment";

export default function (router: Router) {
  router.use("/expenses", (req: Request, res: Response, next: NextFunction) => {
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
      (err: Error, months: IMonth[]) => {
        if (err) {
          return res.send(err);
        } else if (months) {
          res.locals.lastMonthId = months[0]._id;
          console.log(res.locals.lastMonthId);
          return next();
        }
        const defaultMonth = moment.utc().date(1).toDate();
        return res.json(defaultMonth);
      }
    );
  });

  router.use("/expenses", (req: Request, res: Response, next: NextFunction) => {
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

    Expense.find(
      { name: req.body.name },
      (err: Error, expenses: IExpense[]) => {
        if (err) {
          return res.send(err);
        }
        if (
          expenses.length == 0 ||
          req.params.id /*&&
          req.sameNameExpenses.length == 1 &&
          req.sameNameExpenses.some((c) => c._id == req.params.id)*/
        ) {
          return next();
        }
      }
    );

    if (!req.body.categoryId) {
      res.status(400);
      return res.send("La catégorie est requise");
    }

    Category.findById(
      new mongoose.Types.ObjectId(req.body.categoryId),
      (err: Error, categories: ICategory[]) => {
        if (err) {
          return res.send(err);
        }
        if (categories.length == 0) {
          res.status(400);
          return res.send("La catégorie est introuvable");
        }
      }
    );

    if (!req.body.distributionTypeId) {
      res.status(400);
      return res.send("La méthode de distribution est requise");
    }

    DistributionType.findById(
      new mongoose.Types.ObjectId(req.body.distributionTypeId),
      (err: Error, distributionTypes: IDistributionType[]) => {
        if (err) {
          return res.send(err);
        }
        if (distributionTypes.length == 0) {
          res.status(400);
          return res.send("La méthode de distribution est introuvable");
        }
      }
    );
  });

  router
    .route("/expenses")
    .get((req: Request, res: Response) => {
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
                $gt: ["$startDate", res.locals.lastMonthId],
              },
              canEditStartDate: {
                $gt: ["$startDate", res.locals.lastMonthId],
              },
              canEditEndDate: {
                $or: [
                  {
                    endDate: null,
                  },
                  {
                    $gt: ["$endDate", res.locals.lastMonthId],
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
        (err: Error, expenses: IExpense[]) => {
          if (err) {
            return res.send(err);
          }
          return res.json(expenses);
        }
      );
    })
    .post((req: Request, res: Response) => {
      req.body._id = new mongoose.Types.ObjectId();
      const expense = new Expense(req.body);
      expense.save();
      res.status(201);
      req.params.expenseId = expense._id.toString();
      return GetExpense(req, res);
    });

  router.use(
    "/expenses/:expenseId/amounts",
    (req: Request, res: Response, next) => {
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

      Expense.findById(
        new mongoose.Types.ObjectId(req.params.expenseId),
        (err: Error, expense: IExpense) => {
          if (err) {
            return res.send(err);
          } else if (!expense) {
            res.status(404);
            return res.send("Dépense introuvable");
          }

          res.locals.expense = expense;
          let update = false;
          if (req.method == "PUT") {
            update = true;
            req.body.id = new mongoose.Types.ObjectId(
              req.url.substr(1, req.url.length - 1)
            );
          }
          const validationErrors = validAmountService().isValid(
            req.body,
            expense.amounts,
            res.locals.lastMonthId,
            update
          );
          if (validationErrors) {
            res.status(400);
            return res.send(validationErrors);
          }

          return next();
        }
      );
    }
  );

  function GetAmounts(req: Request, res: Response) {
    Expense.aggregate(
      [
        {
          $match: {
            _id: new mongoose.Types.ObjectId(req.params.expenseId),
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
              $gt: ["$startDate", res.locals.lastMonthId],
            },
            canEditStartDate: {
              $gt: ["$startDate", res.locals.lastMonthId],
            },
            canEditEndDate: {
              $or: [
                {
                  $eq: ["$endDate", null],
                },
                {
                  $gt: ["$endDate", res.locals.lastMonthId],
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
            amounts: "$amountHistory",
          },
        },
      ],
      (err: Error, expenses: IExpense[]) => {
        if (err) {
          return res.send(err);
        }
        return res.json(expenses[0].amounts);
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
              _id: new mongoose.Types.ObjectId(req.params.expenseId),
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
              "amounts._id": new mongoose.Types.ObjectId(req.params.amountId),
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
                $gt: ["$startDate", res.locals.lastMonthId],
              },
              canEditStartDate: {
                $gt: ["$startDate", res.locals.lastMonthId],
              },
              canEditEndDate: {
                $or: [
                  {
                    $eq: ["$endDate", null],
                  },
                  {
                    $gt: ["$endDate", res.locals.lastMonthId],
                  },
                ],
              },
            },
          },
        ],
        (err: Error, expenses: IExpense[]) => {
          if (err) {
            return res.send(err);
          }
          return res.json(expenses[0]);
        }
      );
    })
    .put((req, res) => {
      req.body._id = req.params.amountId;
      const previousAmountToUpdate = res.locals.expense.amounts.find(
        (s: IAmount) =>
          s.endDate == null &&
          s.startDate < req.body.startDate &&
          s._id != new mongoose.Types.ObjectId(req.params.amountId)
      );
      if (previousAmountToUpdate) {
        previousAmountToUpdate.endDate = req.body.startDate;
        previousAmountToUpdate.endDate = req.body.endDate.setMonth(
          req.body.endDate.getMonth() - 1
        );
      }

      const amountToUpdate = res.locals.expense.amounts.find(
        (s: IAmount) =>
          s._id == new mongoose.Types.ObjectId(req.params.amountId)
      );
      if (amountToUpdate) {
        amountToUpdate.amount = req.body.amount;
        amountToUpdate.startDate = req.body.startDate;
        amountToUpdate.endDate = req.body.endDate;
      }

      res.locals.expense.save();

      return GetAmounts(req, res);
    });

  router
    .route("/expenses/:expenseId/amounts")
    .get(GetAmounts)
    .post((req: Request, res: Response) => {
      req.body._id = new mongoose.Types.ObjectId();
      const amountToUpdate = res.locals.expense.amounts.find(
        (s: IAmount) => s.endDate == null
      );
      if (amountToUpdate) {
        amountToUpdate.endDate = req.body.startDate;
        amountToUpdate.endDate = amountToUpdate.endDate.setMonth(
          amountToUpdate.endDate.getMonth() - 1
        );
      }
      res.locals.expense.amounts.push(req.body);
      res.locals.expense.save();

      return GetAmounts(req, res);
    });

  function GetExpense(req: Request, res: Response) {
    Expense.aggregate(
      [
        {
          $match: {
            _id: new mongoose.Types.ObjectId(req.params.expenseId),
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
              $gt: ["$startDate", res.locals.lastMonthId],
            },
            canEditStartDate: {
              $gt: ["$startDate", res.locals.lastMonthId],
            },
            canEditEndDate: {
              $or: [
                {
                  $eq: ["$endDate", null],
                },
                {
                  $gt: ["$endDate", res.locals.lastMonthId],
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
      (err: Error, expenses: IExpense[]) => {
        if (err) {
          return res.send(err);
        }
        return res.json(expenses[0]);
      }
    );
  }

  router
    .route("/expenses/:expenseId")
    .get(GetExpense)
    .put((req, res) => {
      Expense.findByIdAndUpdate(
        new mongoose.Types.ObjectId(req.params.expenseId),
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
}
