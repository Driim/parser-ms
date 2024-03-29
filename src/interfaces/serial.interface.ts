import { Document, Schema } from 'mongoose';

export class Season {
  name: string;
  desc: string;
  img: string;
  url: string;
  starts: number; /* FIXME: can't be less than 1950 */
  actors: string[];
}

export interface Serial extends Document {
  _id: Schema.Types.ObjectId;
  name: string;
  alias: string[];
  genre: string[];
  country: string[];
  director: string[];
  voiceover: string[];
  season: Season[];
}
