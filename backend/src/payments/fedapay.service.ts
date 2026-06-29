import { Injectable, Logger } from '@nestjs/common';
import { FedaPay, Transaction } from 'fedapay';

export interface FedaPayCustomer {
  firstname?: string;
  lastname?: string;
  email?: string;
  /** Numéro de téléphone du payeur (pré-rempli sur la page). */
  phoneNumber?: string;
  /** Code pays FedaPay du numéro, ex: 'bj'. */
  phoneCountry?: string;
}

export interface CreateTransactionResult {
  transactionId: string;
  reference: string | null;
  url: string;
}

/**
 * Fin wrapper autour du SDK FedaPay (page de paiement hébergée).
 * Clés lues depuis l'environnement : FEDAPAY_SECRET_KEY, FEDAPAY_ENV (sandbox|live).
 */
@Injectable()
export class FedaPayService {
  private readonly logger = new Logger(FedaPayService.name);
  private configured = false;

  private configure() {
    if (this.configured) {
      return;
    }

    const apiKey = process.env.FEDAPAY_SECRET_KEY;
    if (!apiKey) {
      throw new Error(
        'FEDAPAY_SECRET_KEY non configurée. Ajoute la clé secrète FedaPay dans .env.',
      );
    }

    FedaPay.setApiKey(apiKey);
    FedaPay.setEnvironment(
      (process.env.FEDAPAY_ENV || 'sandbox') === 'live' ? 'live' : 'sandbox',
    );
    this.configured = true;
  }

  /** Crée une transaction et renvoie l'URL de la page de paiement. */
  async createTransaction(params: {
    amount: number;
    description: string;
    callbackUrl: string;
    currency?: string;
    customer: FedaPayCustomer;
  }): Promise<CreateTransactionResult> {
    this.configure();

    const transaction = await Transaction.create({
      description: params.description,
      amount: Math.max(1, Math.round(params.amount)),
      currency: { iso: params.currency || 'XOF' },
      callback_url: params.callbackUrl,
      customer: {
        firstname: params.customer.firstname || 'Client',
        lastname: params.customer.lastname || 'HangOutHub',
        email: params.customer.email || undefined,
        ...(params.customer.phoneNumber
          ? {
              phone_number: {
                number: params.customer.phoneNumber,
                country: params.customer.phoneCountry || 'bj',
              },
            }
          : {}),
      },
    });

    const token = await transaction.generateToken();

    return {
      transactionId: String(transaction.id),
      reference: transaction.reference ? String(transaction.reference) : null,
      url: token.url,
    };
  }

  /**
   * Récupère le statut d'une transaction (source de vérité côté FedaPay).
   * Valeurs : pending | approved | declined | canceled | refunded | transferred.
   */
  async getStatus(transactionId: string): Promise<string> {
    this.configure();
    const transaction = await Transaction.retrieve(Number(transactionId));
    return String(transaction.status || '').toLowerCase();
  }
}
