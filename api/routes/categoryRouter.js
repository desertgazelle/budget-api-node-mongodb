const Category = require("../../models/category");
const { ObjectId } = require("mongoose").Types;

module.exports = function (router) {
  router.use("/categories", (req, res, next) => {
    if (!req.body.name) {
      return next();
    }
    Category.find(req.body, (err, categories) => {
      if (err) {
        return res.send(err);
      }
      if (
        categories.length == 0 ||
        (req.params.id &&
          req.sameNameCategories.length == 1 &&
          req.sameNameCategories.some((c) => c._id == req.params.id))
      ) {
        return next();
      }

      res.status(400);
      return res.send("Cette catégorie existe déjà");
    });
  });

  router
    .route("/categories")
    .get((req, res) => {
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
        (err, categories) => {
          if (err) {
            return res.send(err);
          }
          return res.json(categories);
        }
      );
    })
    .post((req, res) => {
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
    .get((req, res) => {
      Category.findById(ObjectId(req.params.id), (err, category) => {
        if (err) {
          return res.send(err);
        }
        return res.json(category);
      });
    })
    .put((req, res) => {
      Category.findByIdAndUpdate(
        ObjectId(req.params.id),
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
};
