const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");

const amountSchema = mongoose.Schema({
  _id: { type: ObjectId },
  amount: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
});

amountSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

const expenseSchema = mongoose.Schema({
  _id: { type: ObjectId },
  name: { type: String, required: true },
  categoryId: { type: ObjectId, ref: "categories", required: true },
  distributionTypeId: {
    type: ObjectId,
    ref: "distributionTypes",
    required: true,
  },
  amounts: [amountSchema],
});

expenseSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

module.exports = mongoose.model("expense", expenseSchema);
