const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");

const salarySchema = mongoose.Schema({
  _id: { type: ObjectId },
  amount: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
});

salarySchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

const contributorSchema = mongoose.Schema({
  _id: { type: ObjectId },
  name: { type: String, required: true },
  salaries: [salarySchema],
});

contributorSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

module.exports = mongoose.model("contributor", contributorSchema);
