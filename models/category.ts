import { Document, Model, model, Schema } from "mongoose";

export interface ICategory extends Document {
  name: string;
}

const categorySchema: Schema = new Schema({
  name: { type: String, required: true },
});

categorySchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

const Category: Model<ICategory> = model(
  "category",
  categorySchema,
  "categories"
);

export default Category;
