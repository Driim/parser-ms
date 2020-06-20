import { Controller, Get, Query } from '@nestjs/common';
import { ParserService } from './parser.service';

@Controller()
export class ParserController {
  constructor (private readonly service: ParserService) {}
  /**
   * TODO: schedule parsers
   */
  @Get('check/:name')
  async check (@Query('name') name: string): Promise<void> {
    return this.service.check(name);
  }
}
