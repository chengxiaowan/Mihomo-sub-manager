import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './auth/api-key.guard';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { OperationLogModule } from './operation-log/operation-log.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { ProxyNodeModule } from './proxy-node/proxy-node.module';
import { ProxyGroupModule } from './proxy-group/proxy-group.module';
import { ProfileModule } from './profile/profile.module';
import { ProfileRuleModule } from './profile-rule/profile-rule.module';
import { RuleTemplateModule } from './rule-template/rule-template.module';
import { GeneratorModule } from './generator/generator.module';
import { PublishModule } from './publish/publish.module';

@Module({
  imports: [
    PrismaModule,
    OperationLogModule,
    SubscriptionModule,
    ProxyNodeModule,
    ProxyGroupModule,
    ProfileModule,
    ProfileRuleModule,
    RuleTemplateModule,
    GeneratorModule,
    PublishModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ApiKeyGuard },
  ],
})
export class AppModule {}
