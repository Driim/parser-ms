import { Schema } from 'mongoose';
import { SERIAL_MODEL, USER_MODEL } from '../constants.app';

export const SubscriptionSchema = new Schema({
  serial: {
    type: Schema.Types.ObjectId,
    ref: SERIAL_MODEL,
    unique: true,
  },
  fans: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: USER_MODEL,
      },
      voiceover: [String],
    },
  ],
});
