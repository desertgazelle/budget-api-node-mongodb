import { ObjectId } from "mongodb";
import { Document, Model, model, Schema } from "mongoose";

export interface IAmount extends Document {
  _id: ObjectId;
  amount: number;
  startDate: Date;
  endDate?: Date;
}

const amountSchema = new Schema({
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

export interface IExpense extends Document {
  _id: ObjectId;
  name: string;
  categoryId: ObjectId;
  distributionTypeId: ObjectId;
  amounts: IAmount[];
}

const expenseSchema = new Schema({
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

const Expense: Model<IExpense> = model("expense", expenseSchema);

export default Expense;
