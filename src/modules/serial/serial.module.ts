import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SERIAL_MODEL } from '../../constants.app';
import { SerialSchema } from '../../schemas';
import { SerialService } from './serial.provider';

@Module({
  imports: [MongooseModule.forFeature([{ name: SERIAL_MODEL, schema: SerialSchema }])],
  providers: [SerialService],
  exports: [SerialService],
})
export class SerialModule {}
