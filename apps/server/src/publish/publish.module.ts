import { Module } from '@nestjs/common';
import { GeneratorModule } from '../generator/generator.module';
import { PublishController } from './publish.controller';

@Module({
  imports: [GeneratorModule],
  controllers: [PublishController],
})
export class PublishModule {}
