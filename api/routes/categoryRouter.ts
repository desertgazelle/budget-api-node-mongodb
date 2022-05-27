import Category, { ICategory } from "../../models/category";
import { Router, Request, Response } from "express";
import mongoose from "mongoose";

export default function (router: Router) {
  router.use("/categories", (req: Request, res: Response, next) => {
    if (!req.body.name) {
      return next();
    }
    Category.find(req.body, (err: Error, categories: ICategory[]) => {
      if (err) {
        return res.send(err);
      }
      if (
        categories.length == 0 ||
        req.params.id /*&&
          req.sameNameCategories.length == 1 &&
          req.sameNameCategories.some((c: ICategory) => c._id == req.params.id)*/
      ) {
        return next();
      }

      res.status(400);
      return res.send("Cette catégorie existe déjà");
    });
  });

  router
    .route("/categories")
    .get((req, res: Response) => {
      Category.aggregate(
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
        (err: Error, categories: ICategory[]) => {
          if (err) {
            return res.send(err);
          }
          return res.json(categories);
        }
      );
    })
    .post((req, res: Response) => {
      if (!req.body || !req.body.name) {
        res.status(400);
        return res.send("Le nom est requis");
      }

      const category = new Category(req.body);
      category.save();
      res.status(201);
      return res.json(category);
    });

  router
    .route("/categories/:id")
    .get((req, res: Response) => {
      Category.findById(
        new mongoose.Types.ObjectId(req.params.id),
        (err: Error, category: ICategory) => {
          if (err) {
            return res.send(err);
          }
          return res.json(category);
        }
      );
    })
    .put((req, res: Response) => {
      Category.findByIdAndUpdate(
        new mongoose.Types.ObjectId(req.params.id),
        req.body,
        { new: true },
        (err, category) => {
          if (err) {
            return res.send(err);
          }
          return res.json(category);
        }
      );
    });
}
