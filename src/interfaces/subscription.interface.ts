import { Document, Schema } from 'mongoose';

export interface FanInterface {
  user: Schema.Types.ObjectId;
  voiceover: string[];
}

interface SubscriptionBase extends Document {
  fans: FanInterface[];
}

export interface Subscription extends SubscriptionBase {
  serial: Schema.Types.ObjectId;
}
