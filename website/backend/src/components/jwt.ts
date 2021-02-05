import {Component} from '@layr/component';
import jwt from 'jsonwebtoken';
import env from 'env-var';

// Tip: Use `openssl rand -hex 64` to generate a JWT secret

const secret = env.get('JWT_SECRET').required().asString();
const secretBuffer = Buffer.from(secret, 'hex');
const algorithm = 'HS256';

export class JWT extends Component {
  static generate(payload: object) {
    return jwt.sign(payload, secretBuffer, {algorithm});
  }

  static verify(token: string) {
    try {
      return jwt.verify(token, secretBuffer, {algorithms: [algorithm]});
    } catch (err) {
      return undefined;
    }
  }
}
