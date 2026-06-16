import { Module } from '@nestjs/common';
import { ProfileModule } from '../profile/profile.module';
import { GeneratorService } from './generator.service';
import { GeneratorController } from './generator.controller';

@Module({
  imports: [ProfileModule],
  controllers: [GeneratorController],
  providers: [GeneratorService],
  exports: [GeneratorService],
})
export class GeneratorModule {}
