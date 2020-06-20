import { Document } from 'mongoose';

export interface Special extends Document {
  name: string;
  studio: string;
  alias: string;
}
