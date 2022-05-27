import { Document, Model, model, Schema } from "mongoose";

export interface IMonth extends Document {
  _id: Date;
}

const monthSchema = new Schema({
  _id: { type: Date, required: true },
});

monthSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

const Month: Model<IMonth> = model("month", monthSchema, "months");

export default Month;
