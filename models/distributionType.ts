import { ObjectId } from "mongodb";
import { Document, Model, model, Schema } from "mongoose";

export interface IDistributionType extends Document {
  _id: ObjectId;
  name: string;
}
const distributionTypeSchema = new Schema({
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

const DistributionType: Model<IDistributionType> = model(
  "distributionType",
  distributionTypeSchema,
  "distributionTypes"
);

export default DistributionType;
