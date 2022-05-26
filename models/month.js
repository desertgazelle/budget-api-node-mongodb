const mongoose = require("mongoose");

const monthSchema = mongoose.Schema({
  _id: { type: Date, required: true },
});

monthSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

module.exports = mongoose.model("month", monthSchema, "months");
