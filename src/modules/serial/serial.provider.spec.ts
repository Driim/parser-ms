import { Model } from 'mongoose';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SerialService } from './serial.provider';
import { TRANSPORT_SERVICE, SERIAL_MODEL } from '../../constants.app';
import { Serial } from '../../interfaces';
import { SerialModule } from './serial.module';

const TESTING_NAME = 'Testing';

describe('Serial Service', () => {
  let service: SerialService;
  let model: Model<Serial>;
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        ClientsModule.register([
          {
            name: TRANSPORT_SERVICE,
            transport: Transport.REDIS,
            options: { url: 'redis://localhost:6379' },
          },
        ]),
        MongooseModule.forRootAsync({
          useFactory: async () => ({
            uri: 'mongodb://localhost:27017/swatcher_test',
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
          }),
        }),
        SerialModule,
      ],
    }).compile();

    service = app.get<SerialService>(SerialService);
    model = app.get<Model<Serial>>(getModelToken(SERIAL_MODEL));

    const serial = new model();
    serial.name = TESTING_NAME;
    serial.alias = ['Alias'];
    serial.country = ['Russia'];
    serial.director = [];
    serial.genre = [];
    serial.voiceover = [];
    serial.season = [];
    await serial.save();
  });

  describe('Add season if new', () => {
    const season = {
      name: '1 сезон',
      desc: '',
      img: '',
      url: '',
      starts: 1950,
      actors: [],
    };

    it('should skip if already exist', async () => {
      const serial = await service.findExact(TESTING_NAME);
      serial.season.push(season);
      await serial.save();

      await service.addSeason(serial, season);

      expect(serial.season.length).toBe(1);
    });

    it('should add season', async () => {
      const serial = await service.findExact(TESTING_NAME);

      await service.addSeason(serial, season);

      expect(serial.season.length).toBe(1);
    });
  });

  describe('Add voiceover if new', () => {
    it('should skip if studio is empty', async () => {
      const serial = await service.findExact(TESTING_NAME);

      await service.addVoiceoverIfNew(serial, '');

      expect(serial.voiceover.length).toBe(0);
    });
    it('should skip if studio exists', async () => {
      const serial = await service.findExact(TESTING_NAME);
      serial.voiceover.push('test');
      await serial.save();

      await service.addVoiceoverIfNew(serial, 'test');

      expect(serial.voiceover.length).toBe(1);
    });

    it('should add voiceover if new', async () => {
      const serial = await service.findExact(TESTING_NAME);

      await service.addVoiceoverIfNew(serial, 'test');

      expect(serial.voiceover.length).toBe(1);
    });
  });

  afterAll(async () => {
    await model.deleteMany({}).exec();
    app.close();
  });
});
