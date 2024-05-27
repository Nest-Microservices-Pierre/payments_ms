import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { envs } from 'src/config';
import { PaymentSessionDto } from 'src/dto/payment-session.dto';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.stripeSecretKey);

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
    return session;
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
        console.log(paymentIntent.metadata.orderId);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    return res.json({ received: true });
  }
}
