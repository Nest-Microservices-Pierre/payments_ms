import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { NATS_SERVICE, envs } from 'src/config';
import { PaymentSessionDto } from 'src/dto/payment-session.dto';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.stripeSecretKey);
  private logger = new Logger('PaymentsService');

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {}
  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
    const { currency, items, orderId } = paymentSessionDto;

    const lineItems = items.map((item) => {
      return {
        price_data: {
          currency,
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      };
    });

    const session = await this.stripe.checkout.sessions.create({
      //Colocar el ID de mi orden
      payment_intent_data: {
        metadata: {
          orderId: orderId,
        },
      },
      //items que la gente esta comprando
      line_items: lineItems,
      mode: 'payment',
      success_url: envs.successPaymentUrl,
      cancel_url: envs.cancelledPaymentUrl,
      payment_method_types: ['card'],
    });
    return {
      url_cancel: session.cancel_url,
      url_success: session.success_url,
      url: session.url,
    };
  }

  async stripeWebHookHandler(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req['rawBody'],
        sig,
        envs.stripeWebhookSecret,
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'charge.succeeded':
        const paymentIntent = event.data.object;
        // console.log(paymentIntent.metadata.orderId);
        const payload = {
          stripePaymentId: paymentIntent.id,
          orderId: paymentIntent.metadata.orderId,
          receiptUrl: paymentIntent.receipt_url,
        };
        // this.logger.log(payload);
        this.client.emit('payment.succeed', payload);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    return res.json({ received: true });
  }
}
