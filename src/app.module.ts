import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ParserModule } from './modules/parser';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      }),
      inject: [ConfigService],
    }),
    ParserModule,
  ],
})
export class AppModule {}
