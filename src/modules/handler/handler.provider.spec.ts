import { Test, TestingModule } from '@nestjs/testing';
import { ClientsModule } from '@nestjs/microservices';
import { TRANSPORT_SERVICE, ANNOUNCE_MODEL, SERIAL_MODEL } from '../../constants.app';
import { Transport } from '@nestjs/common/enums/transport.enum';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { AnnounceHandlerModule } from './handler.module';
import { AnnounceHandlerService } from './handler.provider';
import { Model } from 'mongoose';
import { Announce, Serial } from '../../interfaces';
import { SpecialCaseService } from '../special';
import { AnnounceDto } from './announce.dto';
import { SerialService } from '../serial';

describe('Announce Handler Service', () => {
  let service: AnnounceHandlerService;
  let specialCaseService: SpecialCaseService;
  let serialService: SerialService;
  let model: Model<Announce>;
  let serialModel: Model<Serial>;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
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
        AnnounceHandlerModule,
      ],
    }).compile();

    service = module.get<AnnounceHandlerService>(AnnounceHandlerService);
    specialCaseService = module.get<SpecialCaseService>(SpecialCaseService);
    serialService = module.get<SerialService>(SerialService);
    model = module.get<Model<Announce>>(getModelToken(ANNOUNCE_MODEL));
    serialModel = module.get<Model<Serial>>(getModelToken(SERIAL_MODEL));
  });

  describe('process', () => {
    const TESTING_NAME = 'Test serial';
    let announce: AnnounceDto;
    let serial: Serial;

    beforeEach(async () => {
      announce = new AnnounceDto();
      announce.name = TESTING_NAME;
      announce.season = '1 season';
      announce.series = '1';
      announce.studio = 'lostfilm';
      announce.date = new Date();

      serial = new serialModel();
      serial.name = TESTING_NAME;
      serial.alias = ['Alias'];
      serial.country = ['Russia'];
      serial.director = [];
      serial.genre = [];
      serial.voiceover = [];
      serial.season = [];
    });

    it('should not process invalid data', async () => {
      const obj = new AnnounceDto();

      jest.spyOn(specialCaseService, 'check').mockResolvedValue('test');

      await service.process([obj]);
      expect(specialCaseService.check).not.toBeCalled();
    });

    it("should skip new serials if can't parse them", async () => {
      announce.parse = async (url: string, name: string, follow: boolean) => Promise.reject('error');
      jest.spyOn(specialCaseService, 'check').mockResolvedValue(TESTING_NAME);
      jest.spyOn(serialService, 'findExact').mockResolvedValue(null);
      jest.spyOn(serialService, 'hadSeason').mockReturnValue(false);

      await service.process([announce]);

      expect(serialService.hadSeason).not.toBeCalled();
    });

    it("should work even if can't parse new season", async () => {
      announce.parse = async (url: string, name: string, follow: boolean) => Promise.reject('error');
      jest.spyOn(specialCaseService, 'check').mockResolvedValue(TESTING_NAME);
      jest.spyOn(serialService, 'findExact').mockResolvedValue(serial);
      jest.spyOn(serialService, 'hadSeason').mockReturnValue(false);
      jest.spyOn(serialService, 'addSeason').mockResolvedValue(serial);
      jest.spyOn(service, 'checkAlreadyExist').mockResolvedValue(true);

      await service.process([announce]);

      expect(serialService.addSeason).not.toBeCalled();
    });

    /** TODO: */
    xit('should skip existing announces', async () => {});
    xit('should save new announce', async () => {});
  });

  afterAll(async () => {
    await model.deleteMany({}).exec();
    module.close();
  });
});
