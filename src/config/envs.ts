import 'dotenv/config';
import * as joi from 'joi';

interface envConfig {
  PORT: number;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SUCCESS_PAYMENT_URL: string;
  CANCELLED_PAYMENT_URL: string;
}

const envsSchema: joi.ObjectSchema = joi
  .object({
    PORT: joi.number().default(3000),
    STRIPE_SECRET_KEY: joi.string().required(),
    STRIPE_WEBHOOK_SECRET: joi.string().required(),
    SUCCESS_PAYMENT_URL: joi.string().required(),
    CANCELLED_PAYMENT_URL: joi.string().required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate(process.env);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envConfig: envConfig = value;

export const envs = {
  port: envConfig.PORT,
  stripeSecretKey: envConfig.STRIPE_SECRET_KEY,
  stripeWebhookSecret: envConfig.STRIPE_WEBHOOK_SECRET,
  successPaymentUrl: envConfig.SUCCESS_PAYMENT_URL,
  cancelledPaymentUrl: envConfig.CANCELLED_PAYMENT_URL,
};
