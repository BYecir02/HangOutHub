import { Module } from '@nestjs/common';

import { FedaPayService } from './fedapay.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, FedaPayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
