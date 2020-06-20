import { Module } from '@nestjs/common';
import { AnnounceHandlerService } from './handler.provider';
import { MongooseModule } from '@nestjs/mongoose';
import { ANNOUNCE_MODEL, TRANSPORT_SERVICE } from '../../constants.app';
import { AnnounceSchema } from '../../schemas';
import { SpecialCaseModule } from '../special';
import { SerialModule } from '../serial/serial.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, RedisOptions, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: ANNOUNCE_MODEL, schema: AnnounceSchema }]),
    SpecialCaseModule,
    SerialModule,
  ],
  providers: [
    {
      provide: TRANSPORT_SERVICE,
      useFactory: (config: ConfigService): ClientProxy => {
        const options: RedisOptions = {
          transport: Transport.REDIS,
          options: {
            url: config.get<string>('REDIS_URI'),
          },
        };
        return ClientProxyFactory.create(options);
      },
      inject: [ConfigService],
    },
    AnnounceHandlerService,
  ],
  exports: [AnnounceHandlerService],
})
export class AnnounceHandlerModule {}
