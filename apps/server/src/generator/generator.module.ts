import { Module } from '@nestjs/common';
import { ProfileModule } from '../profile/profile.module';
import { GeneratorService } from './generator.service';

@Module({
  imports: [ProfileModule],
  providers: [GeneratorService],
  exports: [GeneratorService],
})
export class GeneratorModule {}
