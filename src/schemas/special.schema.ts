import { Schema } from 'mongoose';

export const SpecialCaseSchema = new Schema({
  name: String,
  studio: String,
  alias: String,
});
