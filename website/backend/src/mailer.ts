import nodemailer from 'nodemailer';
import aws from 'aws-sdk';

const AWS_SES_REGION = 'us-east-1';

const sesClient = new aws.SES({region: AWS_SES_REGION, apiVersion: '2010-12-01'});

const transporter = nodemailer.createTransport({
  SES: sesClient,
  sendingRate: 1
});

export async function sendMail({
  from = process.env.EMAIL_ADDRESS,
  to = process.env.EMAIL_ADDRESS,
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
