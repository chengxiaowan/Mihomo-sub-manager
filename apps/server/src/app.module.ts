import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { ProxyNodeModule } from './proxy-node/proxy-node.module';
import { RuleModule } from './rule/rule.module';
import { ProfileModule } from './profile/profile.module';
import { GeneratorModule } from './generator/generator.module';
import { PublishModule } from './publish/publish.module';

@Module({
  imports: [
    PrismaModule,
    SubscriptionModule,
    ProxyNodeModule,
    RuleModule,
    ProfileModule,
    GeneratorModule,
    PublishModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
