import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { OperationLogModule } from './operation-log/operation-log.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { ProxyNodeModule } from './proxy-node/proxy-node.module';
import { ProxyGroupModule } from './proxy-group/proxy-group.module';
import { RuleModule } from './rule/rule.module';
import { ProfileModule } from './profile/profile.module';
import { GeneratorModule } from './generator/generator.module';
import { PublishModule } from './publish/publish.module';

@Module({
  imports: [
    PrismaModule,
    OperationLogModule,
    SubscriptionModule,
    ProxyNodeModule,
    ProxyGroupModule,
    RuleModule,
    ProfileModule,
    GeneratorModule,
    PublishModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
