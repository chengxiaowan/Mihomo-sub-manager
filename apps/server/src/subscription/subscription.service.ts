import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.subscriptionSource.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const source = await this.prisma.subscriptionSource.findUnique({
      where: { id },
    });
    if (!source) throw new NotFoundException(`Subscription ${id} not found`);
    return source;
  }

  create(dto: CreateSubscriptionDto) {
    return this.prisma.subscriptionSource.create({ data: dto });
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    await this.findOne(id);
    return this.prisma.subscriptionSource.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.subscriptionSource.delete({ where: { id } });
  }
}
