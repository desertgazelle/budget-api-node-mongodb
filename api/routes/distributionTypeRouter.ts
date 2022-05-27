import DistributionType, {
  IDistributionType,
} from "../../models/distributionType";
import mongoose from "mongoose";
import { Router, Request, Response } from "express";

export default function (router: Router) {
  router.route("/distributionTypes").get((req: Request, res: Response) => {
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
      (err: Error, distributionTypes: IDistributionType[]) => {
        if (err) {
          return res.send(err);
        }
        return res.json(distributionTypes);
      }
    );
  });

  router.route("/distributionTypes/:id").get((req: Request, res: Response) => {
    DistributionType.findById(
      new mongoose.Types.ObjectId(req.params.id),
      (err: Error, distributionType: IDistributionType) => {
        if (err) {
          return res.send(err);
        }
        return res.json(distributionType);
      }
    );
  });
}
