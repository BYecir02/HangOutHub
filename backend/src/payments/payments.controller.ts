import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { PaymentsService } from './payments.service';

interface AuthenticatedRequest {
  user: { userId: string };
}

interface FedaPayWebhookBody {
  name?: string;
  entity?: { id?: number | string };
  transaction?: { id?: number | string };
}

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('bookings/:id/pay')
  startPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.startBookingPayment(req.user.userId, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('bookings/:id/payment-methods')
  paymentMethods(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.getBookingPaymentMethods(req.user.userId, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('bookings/:id/payment-status')
  checkPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.checkBookingPayment(req.user.userId, id);
  }

  // Webhook FedaPay (public). On re-vérifie le statut via l'API côté service.
  // TODO prod : vérifier la signature `x-fedapay-signature` avec le secret de webhook.
  @Post('payments/fedapay/webhook')
  @HttpCode(200)
  async webhook(@Body() body: FedaPayWebhookBody) {
    const rawId = body?.entity?.id ?? body?.transaction?.id ?? null;
    if (rawId != null) {
      await this.paymentsService.handleWebhook(String(rawId));
    }
    return { received: true };
  }
}
