import jwt, {
  Jwt,
  JwtPayload,
  PublicKey,
  Secret,
  SignOptions,
} from "jsonwebtoken";

class TokenService {
  constructor() {}

  GenerateToken = ({
    payload,
    secretKey,
    options,
  }: {
    payload: string | Buffer | object;
    secretKey: Secret;
    options?: SignOptions;
  }): string => {
    return jwt.sign(payload, secretKey, options);
  };

  VerifyToken = ({
    token,
    secretKey,
  }: {
    token: string;
    secretKey: Secret;
  }): JwtPayload | Jwt | string => {
    return jwt.verify(token, secretKey);
  };
}

export default new TokenService();
