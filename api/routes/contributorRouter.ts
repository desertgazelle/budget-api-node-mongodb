import Contributor, { IContributor, ISalary } from "../../models/contributor";
import Month, { IMonth } from "../../models/month";
import validAmountService from "../services/validAmountService";
import mongoose from "mongoose";
import { Router, Request, Response, NextFunction } from "express";
import moment from "moment";

export default function (router: Router) {
  router.use("/contributors", (req: Request, res: Response, next) => {
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
      (err: Error, month: IMonth[]) => {
        if (err) {
          return res.send(err);
        } else if (month) {
          res.locals.lastMonthId = month[0]._id;
          return next();
        }
        const defaultMonth = moment.utc().date(1).toDate();
        return res.json(defaultMonth);
      }
    );
  });

  router.route("/contributors").get((req: Request, res: Response) => {
    Contributor.aggregate(
      [
        {
          $sort: {
            rank: 1,
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
            startDate: {
              $dateToString: { date: "$salaries.startDate", format: "%Y-%m" },
            },
            endDate: {
              $dateToString: { date: "$salaries.endDate", format: "%Y-%m" },
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
      (err: Error, contributors: IContributor[]) => {
        if (err) {
          return res.send(err);
        }
        return res.json(contributors);
      }
    );
  });

  router.use(
    "/contributors/:contributorId/salaries",
    (req: Request, res: Response, next: NextFunction) => {
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

      if (req.body.endDate && !req.body.startDate.match(regexFormat)) {
        res.status(400);
        return res.send("Le format de date est YYYY-MM");
      } else if (req.body.endDate) {
        req.body.startDate = moment.utc(`${req.body.endDate}-01`).toDate();
      }

      Contributor.findById(
        new mongoose.Types.ObjectId(req.params.contributorId),
        (err: Error, contributor: IContributor) => {
          if (err) {
            return res.send(err);
          } else if (!contributor) {
            res.status(404);
            return res.send("Contributeur introuvable");
          }

          res.locals.contributor = contributor;
          let update = false;
          if (req.method == "PUT") {
            update = true;
            req.body.id = new mongoose.Types.ObjectId(
              req.url.substr(1, req.url.length - 1)
            );
          }
          const validationErrors = validAmountService().isValid(
            req.body,
            contributor.salaries,
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

  function GetSalaries(req: Request, res: Response) {
    Contributor.aggregate(
      [
        {
          $match: {
            _id: new mongoose.Types.ObjectId(req.params.contributorId),
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
            startDate: {
              $dateToString: { date: "$salaries.startDate", format: "%Y-%m" },
            },
            endDate: {
              $dateToString: { date: "$salaries.endDate", format: "%Y-%m" },
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
            salaries: "$salaryHistory",
          },
        },
      ],
      (err: Error, contributors: IContributor[]) => {
        if (err) {
          return res.send(err);
        }
        return res.json(contributors[0].salaries);
      }
    );
  }

  router
    .route("/contributors/:contributorId/salaries")
    .get(GetSalaries)
    .post((req: Request, res) => {
      req.body._id = new mongoose.Types.ObjectId();
      const salaryToUpdate = res.locals.contributor.salaries.find(
        (s: ISalary) => s.endDate == null
      );
      if (salaryToUpdate) {
        salaryToUpdate.endDate = req.body.startDate;
        salaryToUpdate.endDate = salaryToUpdate.endDate.setMonth(
          salaryToUpdate.endDate.getMonth() - 1
        );
      }
      res.locals.contributor.salaries.push(req.body);
      res.locals.contributor.save();

      return GetSalaries(req, res);
    });

  router
    .route("/contributors/:contributorId/salaries/:salaryId")
    .get((req: Request, res) => {
      Contributor.aggregate(
        [
          {
            $match: {
              _id: new mongoose.Types.ObjectId(req.params.contributorId),
            },
          },
          {
            $unwind: {
              path: "$salaries",
            },
          },
          {
            $match: {
              "salaries._id": new mongoose.Types.ObjectId(req.params.salaryId),
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              amount: "$salaries.amount",
              salaryId: "$salaries._id",
              startDate: {
                $dateToString: { date: "$salaries.startDate", format: "%Y-%m" },
              },
              endDate: {
                $dateToString: { date: "$salaries.endDate", format: "%Y-%m" },
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
        (err: Error, salaries: ISalary[]) => {
          if (err) {
            return res.send(err);
          }
          return res.json(salaries[0]);
        }
      );
    })
    .put((req: Request, res) => {
      req.body._id = req.params.salaryId;
      const previousSalaryToUpdate = res.locals.contributor.salaries.find(
        (s: ISalary) =>
          s.endDate == null &&
          s.startDate < req.body.startDate &&
          s._id != new mongoose.Types.ObjectId(req.params.salaryId)
      );
      if (previousSalaryToUpdate) {
        previousSalaryToUpdate.endDate = req.body.startDate;
        previousSalaryToUpdate.endDate = req.body.endDate.setMonth(
          req.body.endDate.getMonth() - 1
        );
      }

      const salaryToUpdate = res.locals.contributor.salaries.find(
        (s: ISalary) =>
          s._id == new mongoose.Types.ObjectId(req.params.salaryId)
      );
      if (salaryToUpdate) {
        salaryToUpdate.amount = req.body.amount;
        salaryToUpdate.startDate = req.body.startDate;
        salaryToUpdate.endDate = req.body.endDate;
      }

      res.locals.contributor.save();

      return GetSalaries(req, res);
    });

  function GetContributor(req: Request, res: Response) {
    Contributor.aggregate(
      [
        {
          $match: {
            _id: new mongoose.Types.ObjectId(req.params.contributorId),
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
            startDate: {
              $dateToString: { date: "$salaries.startDate", format: "%Y-%m" },
            },
            endDate: {
              $dateToString: { date: "$salaries.endDate", format: "%Y-%m" },
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
      (err: Error, contributors: IContributor[]) => {
        if (err) {
          return res.send(err);
        }
        return res.json(contributors[0]);
      }
    );
  }

  router
    .route("/contributors/:contributorId")
    .get(GetContributor)
    .put((req: Request, res) => {
      Contributor.findByIdAndUpdate(
        new mongoose.Types.ObjectId(req.params.contributorId),
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
}
