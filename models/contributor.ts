import { ObjectId } from "mongodb";
import { Document, Model, model, Schema } from "mongoose";

export interface ISalary extends Document {
  _id: ObjectId;
  amount: number;
  startDate: Date;
  endDate?: Date;
}
const salarySchema = new Schema({
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

export interface IContributor extends Document {
  _id: ObjectId;
  name: string;
  salaries: ISalary[];
}

const contributorSchema = new Schema({
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

const Contributor: Model<IContributor> = model(
  "contributor",
  contributorSchema
);

export default Contributor;
