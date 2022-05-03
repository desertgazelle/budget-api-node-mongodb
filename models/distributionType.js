const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");

const distributionTypeSchema = mongoose.Schema({
  _id: { type: ObjectId },
  name: { type: String, required: true },
});

distributionTypeSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

module.exports = mongoose.model(
  "distributionType",
  distributionTypeSchema,
  "distributionTypes"
);
