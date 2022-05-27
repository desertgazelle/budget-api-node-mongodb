import Expense, { IAmount, IExpense } from "../../models/expense";
import Month, { IMonth } from "../../models/month";
import mongoose from "mongoose";
import { Router, Request, Response, NextFunction } from "express";
import moment from "moment";

export default function (router: Router) {
  router.route("/months/:id").get((req: Request, res: Response) => {
    const monthId = `${req.params.id}-01`;
    Expense.aggregate(
      [
        {
          $unwind: {
            path: "$amounts",
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
            _id: 1,
            name: 1,
            categoryId: 1,
            distributionTypeId: 1,
            category: {
              name: 1,
            },
            distributionType: {
              name: 1,
            },
            amount: "$amounts.amount",
            startDate: "$amounts.startDate",
            endDate: "$amounts.endDate",
          },
        },
        {
          $match: {
            $and: [
              {
                startDate: {
                  $lte: moment.utc(monthId).toDate(),
                },
              },
              {
                $or: [
                  {
                    endDate: null,
                  },
                  {
                    endDate: {
                      $gte: moment.utc(monthId).toDate(),
                    },
                  },
                ],
              },
            ],
          },
        },
        {
          $lookup: {
            from: "contributors",
            pipeline: [
              {
                $unwind: {
                  path: "$salaries",
                },
              },
              {
                $project: {
                  name: 1,
                  salaryId: "$salaries._id",
                  amount: "$salaries.amount",
                  startDate: "$salaries.startDate",
                  endDate: "$salaries.endDate",
                  rank: 1,
                },
              },
              {
                $match: {
                  $and: [
                    {
                      startDate: {
                        $lte: moment.utc(monthId).toDate(),
                      },
                    },
                    {
                      $or: [
                        {
                          endDate: null,
                        },
                        {
                          endDate: {
                            $gte: moment.utc(monthId).toDate(),
                          },
                        },
                      ],
                    },
                  ],
                },
              },
              {
                $facet: {
                  collection: [
                    {
                      $project: {
                        _id: 1,
                        name: 1,
                        amount: 1,
                        rank: 1,
                      },
                    },
                  ],
                  total: [
                    {
                      $group: {
                        _id: null,
                        totalSalaries: {
                          $sum: "$amount",
                        },
                      },
                    },
                  ],
                },
              },
              {
                $unwind: {
                  path: "$collection",
                },
              },
              {
                $unwind: {
                  path: "$total",
                },
              },
              {
                $project: {
                  _id: "$collection._id",
                  name: "$collection.name",
                  rank: "$collection.rank",
                  percentage: {
                    $round: [
                      {
                        $divide: ["$collection.amount", "$total.totalSalaries"],
                      },
                      2,
                    ],
                  },
                },
              },
              {
                $sort: {
                  rank: 1,
                },
              },
            ],
            as: "amountDistribution",
          },
        },
        {
          $unwind: {
            path: "$amountDistribution",
            includeArrayIndex: "rank",
          },
        },
        {
          $project: {
            name: 1,
            category: 1,
            categoryId: 1,
            distributionType: 1,
            distributionTypeId: 1,
            amount: 1,
            rank: 1,
            amountDistribution: {
              _id: 1,
              name: 1,
              percentage: 1,
              rank: 1,
              amount: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: [
                          "$distributionTypeId",
                          new mongoose.Types.ObjectId(
                            "626a9a0eeffe492ef3dfe8a3"
                          ),
                        ],
                      },
                      then: {
                        $round: [
                          {
                            $multiply: [
                              "$amountDistribution.percentage",
                              "$amount",
                            ],
                          },
                          2,
                        ],
                      },
                    },
                    {
                      case: {
                        $and: [
                          {
                            $eq: [
                              "$distributionTypeId",
                              new mongoose.Types.ObjectId(
                                "626a9a0eeffe492ef3dfe8a4"
                              ),
                            ],
                          },
                          {
                            $eq: ["$rank", 0],
                          },
                        ],
                      },
                      then: {
                        $round: [
                          {
                            $multiply: [
                              -1,
                              {
                                $subtract: [
                                  1,
                                  "$amountDistribution.percentage",
                                ],
                              },
                              "$amount",
                            ],
                          },
                          2,
                        ],
                      },
                    },
                    {
                      case: {
                        $and: [
                          {
                            $eq: [
                              "$distributionTypeId",
                              new mongoose.Types.ObjectId(
                                "626a9a0eeffe492ef3dfe8a4"
                              ),
                            ],
                          },
                          {
                            $eq: ["$rank", 1],
                          },
                        ],
                      },
                      then: {
                        $round: [
                          {
                            $multiply: [
                              "$amountDistribution.percentage",
                              "$amount",
                            ],
                          },
                          2,
                        ],
                      },
                    },
                    {
                      case: {
                        $and: [
                          {
                            $eq: [
                              "$distributionTypeId",
                              new mongoose.Types.ObjectId(
                                "626a9a0eeffe492ef3dfe8a5"
                              ),
                            ],
                          },
                          {
                            $eq: ["$rank", 0],
                          },
                        ],
                      },
                      then: {
                        $round: [
                          {
                            $multiply: [
                              "$amountDistribution.percentage",
                              "$amount",
                            ],
                          },
                          2,
                        ],
                      },
                    },
                    {
                      case: {
                        $and: [
                          {
                            $eq: [
                              "$distributionTypeId",
                              new mongoose.Types.ObjectId(
                                "626a9a0eeffe492ef3dfe8a5"
                              ),
                            ],
                          },
                          {
                            $eq: ["$rank", 1],
                          },
                        ],
                      },
                      then: {
                        $round: [
                          {
                            $multiply: [
                              -1,
                              {
                                $subtract: [
                                  1,
                                  "$amountDistribution.percentage",
                                ],
                              },
                              "$amount",
                            ],
                          },
                          2,
                        ],
                      },
                    },
                    {
                      case: {
                        $and: [
                          {
                            $eq: [
                              "$distributionTypeId",
                              new mongoose.Types.ObjectId(
                                "626a9a0eeffe492ef3dfe8a6"
                              ),
                            ],
                          },
                          {
                            $eq: ["$rank", 0],
                          },
                        ],
                      },
                      then: "$amount",
                    },
                    {
                      case: {
                        $and: [
                          {
                            $eq: [
                              "$distributionTypeId",
                              new mongoose.Types.ObjectId(
                                "626a9a0eeffe492ef3dfe8a6"
                              ),
                            ],
                          },
                          {
                            $eq: ["$rank", 1],
                          },
                        ],
                      },
                      then: {
                        $round: [
                          {
                            $multiply: [-1, "$amount"],
                          },
                          2,
                        ],
                      },
                    },
                    {
                      case: {
                        $and: [
                          {
                            $eq: [
                              "$distributionTypeId",
                              new mongoose.Types.ObjectId(
                                "626a9a0eeffe492ef3dfe8a7"
                              ),
                            ],
                          },
                          {
                            $eq: ["$rank", 0],
                          },
                        ],
                      },
                      then: "$amount",
                    },
                    {
                      case: {
                        $and: [
                          {
                            $eq: [
                              "$distributionTypeId",
                              new mongoose.Types.ObjectId(
                                "626a9a0eeffe492ef3dfe8a7"
                              ),
                            ],
                          },
                          {
                            $eq: ["$rank", 1],
                          },
                        ],
                      },
                      then: 0,
                    },
                    {
                      case: {
                        $and: [
                          {
                            $eq: [
                              "$distributionTypeId",
                              new mongoose.Types.ObjectId(
                                "626a9a0eeffe492ef3dfe8a8"
                              ),
                            ],
                          },
                          {
                            $eq: ["$rank", 0],
                          },
                        ],
                      },
                      then: {
                        $round: [
                          {
                            $multiply: [-1, "$amount"],
                          },
                          2,
                        ],
                      },
                    },
                    {
                      case: {
                        $and: [
                          {
                            $eq: [
                              "$distributionTypeId",
                              new mongoose.Types.ObjectId(
                                "626a9a0eeffe492ef3dfe8a8"
                              ),
                            ],
                          },
                          {
                            $eq: ["$rank", 1],
                          },
                        ],
                      },
                      then: "$amount",
                    },
                    {
                      case: {
                        $and: [
                          {
                            $eq: [
                              "$distributionTypeId",
                              new mongoose.Types.ObjectId(
                                "626a9a0eeffe492ef3dfe8a9"
                              ),
                            ],
                          },
                          {
                            $eq: ["$rank", 0],
                          },
                        ],
                      },
                      then: 0,
                    },
                    {
                      case: {
                        $and: [
                          {
                            $eq: [
                              "$distributionTypeId",
                              new mongoose.Types.ObjectId(
                                "626a9a0eeffe492ef3dfe8a9"
                              ),
                            ],
                          },
                          {
                            $eq: ["$rank", 1],
                          },
                        ],
                      },
                      then: "$amount",
                    },
                  ],
                  default: 0,
                },
              },
            },
          },
        },
        {
          $facet: {
            contributors: [
              {
                $group: {
                  _id: {
                    id: "$amountDistribution._id",
                    name: "$amountDistribution.name",
                    percentage: "$amountDistribution.percentage",
                  },
                  totalAmount: {
                    $sum: "$amountDistribution.amount",
                  },
                },
              },
            ],
            expenses: [
              {
                $sort: {
                  "amountDistribution.rank": 1,
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
                    amount: "$amount",
                  },
                  amountDistribution: {
                    $addToSet: {
                      id: "$amountDistribution._id",
                      name: "$amountDistribution.name",
                      amount: "$amountDistribution.amount",
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
                  categoryId: "$_id.categoryId",
                  distributionType: "$_id.distributionType",
                  distributionTypeId: "$_id.distributionTypeId",
                  amount: "$_id.amount",
                  amountDistribution: 1,
                },
              },
            ],
          },
        },
        {
          $unwind: {
            path: "$contributors",
          },
        },
        {
          $project: {
            contributor: {
              id: "$contributors._id.id",
              name: "$contributors._id.name",
              percentage: "$contributors._id.percentage",
              amount: {
                $round: ["$contributors.totalAmount", 0],
              },
            },
            expenses: 1,
          },
        },
        {
          $group: {
            _id: "$expenses",
            contributors: {
              $push: "$contributor",
            },
          },
        },
        {
          $lookup: {
            from: "months",
            pipeline: [
              {
                $limit: 1,
              },
              {
                $lookup: {
                  from: "months",
                  pipeline: [],
                  as: "months",
                },
              },
              {
                $project: {
                  _id: 0,
                  id: {
                    $dateToString: {
                      date: moment.utc(monthId).toDate(),
                      format: "%Y-%m",
                    },
                  },
                  name: {
                    $let: {
                      vars: {
                        month: {
                          $dateToString: {
                            date: moment.utc(monthId).toDate(),
                            format: "%m",
                          },
                        },
                        year: {
                          $dateToString: {
                            date: moment.utc(monthId).toDate(),
                            format: "%Y",
                          },
                        },
                      },
                      in: {
                        $concat: [
                          {
                            $switch: {
                              branches: [
                                {
                                  case: {
                                    $eq: ["$$month", "01"],
                                  },
                                  then: "Janvier",
                                },
                                {
                                  case: {
                                    $eq: ["$$month", "02"],
                                  },
                                  then: "Février",
                                },
                                {
                                  case: {
                                    $eq: ["$$month", "03"],
                                  },
                                  then: "Mars",
                                },
                                {
                                  case: {
                                    $eq: ["$$month", "04"],
                                  },
                                  then: "Avril",
                                },
                                {
                                  case: {
                                    $eq: ["$$month", "05"],
                                  },
                                  then: "Mai",
                                },
                                {
                                  case: {
                                    $eq: ["$$month", "06"],
                                  },
                                  then: "Juin",
                                },
                                {
                                  case: {
                                    $eq: ["$$month", "07"],
                                  },
                                  then: "Juillet",
                                },
                                {
                                  case: {
                                    $eq: ["$$month", "08"],
                                  },
                                  then: "Août",
                                },
                                {
                                  case: {
                                    $eq: ["$$month", "09"],
                                  },
                                  then: "Septembre",
                                },
                                {
                                  case: {
                                    $eq: ["$$month", "10"],
                                  },
                                  then: "Octobre",
                                },
                                {
                                  case: {
                                    $eq: ["$$month", "11"],
                                  },
                                  then: "Novembre",
                                },
                                {
                                  case: {
                                    $eq: ["$$month", "12"],
                                  },
                                  then: "Décembre",
                                },
                              ],
                              default: "$$month",
                            },
                          },
                          " ",
                          "$$year",
                        ],
                      },
                    },
                  },
                  canEdit: {
                    $not: {
                      $anyElementTrue: [
                        {
                          $map: {
                            input: "$months",
                            as: "month",
                            in: {
                              $eq: [
                                "$$month._id",
                                moment.utc(monthId).toDate(),
                              ],
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
            as: "month",
          },
        },
        {
          $unwind: {
            path: "$month",
          },
        },
        {
          $project: {
            id: "$month.id",
            name: "$month.name",
            canEdit: "$month.canEdit",
            contributors: 1,
            expenses: "$_id",
            _id: 0,
          },
        },
      ],
      (err: Error, months: IMonth[]) => {
        if (err) {
          res.status(500);
          return res.send(err);
        }
        return res.json(months[0]);
      }
    );
  });

  router
    .route("/months")
    .get((req: Request, res: Response) => {
      Month.aggregate(
        [
          {
            $sort: {
              _id: -1,
            },
          },
          {
            $project: {
              _id: 0,
              id: {
                $dateToString: {
                  date: "$_id",
                  format: "%Y-%m",
                },
              },
              name: {
                $concat: [
                  {
                    $let: {
                      vars: {
                        month: {
                          $dateToString: {
                            date: "$_id",
                            format: "%m",
                          },
                        },
                      },
                      in: {
                        $switch: {
                          branches: [
                            {
                              case: {
                                $eq: ["$$month", "01"],
                              },
                              then: "Janvier",
                            },
                            {
                              case: {
                                $eq: ["$$month", "02"],
                              },
                              then: "Février",
                            },
                            {
                              case: {
                                $eq: ["$$month", "03"],
                              },
                              then: "Mars",
                            },
                            {
                              case: {
                                $eq: ["$$month", "04"],
                              },
                              then: "Avril",
                            },
                            {
                              case: {
                                $eq: ["$$month", "05"],
                              },
                              then: "Mai",
                            },
                            {
                              case: {
                                $eq: ["$$month", "06"],
                              },
                              then: "Juin",
                            },
                            {
                              case: {
                                $eq: ["$$month", "07"],
                              },
                              then: "Juillet",
                            },
                            {
                              case: {
                                $eq: ["$$month", "08"],
                              },
                              then: "Août",
                            },
                            {
                              case: {
                                $eq: ["$$month", "09"],
                              },
                              then: "Septembre",
                            },
                            {
                              case: {
                                $eq: ["$$month", "10"],
                              },
                              then: "Octobre",
                            },
                            {
                              case: {
                                $eq: ["$$month", "11"],
                              },
                              then: "Novembre",
                            },
                            {
                              case: {
                                $eq: ["$$month", "12"],
                              },
                              then: "Décembre",
                            },
                          ],
                          default: "$$month",
                        },
                      },
                    },
                  },
                  " ",
                  {
                    $dateToString: {
                      date: "$_id",
                      format: "%Y",
                    },
                  },
                ],
              },
            },
          },
          {
            $addFields: {
              canEdit: false,
              contributors: [],
              expenses: [],
            },
          },
        ],
        (err: Error, months: IMonth[]) => {
          if (err) {
            return res.send(err);
          }
          return res.json(months);
        }
      );
    })
    .post((req, res) => {
      if (!req.body.id) {
        res.status(400);
        res.send("id is required");
      }
      const regexFormat = new RegExp("^\\d{4}-\\d{2}$");
      const formatIsValid = req.body.id.match(regexFormat);
      if (!formatIsValid) {
        res.status(400);
        res.send("id format should be YYYY-MM");
      }

      const id = moment.utc(`${req.body.id}-01`).toDate();
      Month.findById(id, (err: Error, month: IMonth) => {
        if (err) {
          res.status(500);
          return res.send(err);
        } else if (month) {
          res.status(400);
          res.send("id already exists");
        } else {
          const month = new Month({ _id: id });
          month.save(function (err) {
            if (err) {
              res.status(500);
              return res.send(err);
            }
            //res.status(201);
            return res.status(201).json(month);
          });
        }
      });
    });
}
