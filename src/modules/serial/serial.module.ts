import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SERIAL_MODEL, SUBSCRIPTION_MODEL } from '../../constants.app';
import { SerialSchema, SubscriptionSchema } from '../../schemas';
import { SerialService } from './serial.provider';

@Module({
  imports: [MongooseModule.forFeature([
    { name: SERIAL_MODEL, schema: SerialSchema },
    { name: SUBSCRIPTION_MODEL, schema: SubscriptionSchema }
  ])],
  providers: [SerialService],
  exports: [SerialService],
})
export class SerialModule {}
