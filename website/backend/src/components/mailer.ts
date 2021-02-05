import {Component} from '@layr/component';
import nodemailer from 'nodemailer';
import aws from 'aws-sdk';
import env from 'env-var';

const AWS_SES_REGION = 'us-east-1';

const emailAddress = env.get('EMAIL_ADDRESS').required().asString();

const sesClient = new aws.SES({region: AWS_SES_REGION, apiVersion: '2010-12-01'});

const transporter = nodemailer.createTransport({
  SES: sesClient,
  sendingRate: 1
});

export class Mailer extends Component {
  static async sendMail({
    from = emailAddress,
    to = emailAddress,
    subject,
    text,
    html
  }: {
    from?: string;
    to?: string;
    subject: string;
    text?: string;
    html?: string;
  }) {
    await transporter.sendMail({from, to, subject, text, html});
  }
}
