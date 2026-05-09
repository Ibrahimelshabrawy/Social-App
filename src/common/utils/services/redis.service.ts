import {createClient, RedisClientType} from "redis";
import {REDIS_URI} from "../../../config/config.service";
import {Types} from "mongoose";
import {EventEnum} from "../../enum/event.enum";

class RedisService {
  private readonly client: RedisClientType;
  constructor() {
    this.client = createClient({
      url: REDIS_URI,
    });
    this.handleError();
  }

  handleError() {
    this.client.on("error", (error) => {
      console.log("Connection To Redis Failed ❗", error);
    });
  }

  async connectRedis() {
    this.client.connect();
    console.log("Connection To Redis Successfully 🥳");
  }

  revokeKey = ({userId, jti}: {userId: Types.ObjectId; jti: string}) => {
    return `revokeToken::${userId}::${jti}`;
  };

  getKeyUserId = (userId: Types.ObjectId) => {
    return `revokeToken::${userId}`;
  };

  getUserProfile = (userId: Types.ObjectId) => {
    return `profile::${userId}`;
  };

  otpKey = ({
    email,
    subject = EventEnum.confirmEmail,
  }: {
    email: string;
    subject?: EventEnum;
  }) => {
    return `otp::${email}::${subject}`;
  };
  blockedOtpKey = ({
    email,
    subject = EventEnum.confirmEmail,
  }: {
    email: string;
    subject?: EventEnum;
  }) => {
    return `${this.otpKey({email, subject})}::Blocked`;
  };
  maxOtpKey = ({
    email,
    subject = EventEnum.confirmEmail,
  }: {
    email: string;
    subject?: EventEnum;
  }) => {
    return `${this.otpKey({email, subject})}::max`;
  };

  loginFailAttempts = (email: string) => {
    return `Fail-Login::${email}`;
  };

  banAccount = (email: string) => {
    return `${this.loginFailAttempts(email)}::Banned`;
  };

  setValue = async ({
    key,
    value,
    ttl,
  }: {
    key: string;
    value: string | object;
    ttl?: number;
  }) => {
    try {
      const data = typeof value === "string" ? value : JSON.stringify(value);

      if (ttl) {
        // ttl by seconds
        await this.client.setEx(key, ttl, data);
      } else {
        await this.client.set(key, data);
      }

      return true;
    } catch (error) {
      console.error("Redis SET error:", error);
      return false;
    }
  };

  getValue = async (key: string) => {
    try {
      const data = await this.client.get(key);
      if (!data) return null;

      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } catch (error) {
      console.error("Redis GET error:", error);
      return null;
    }
  };

  update = async ({
    key,
    value,
    ttl,
  }: {
    key: string;
    value: string;
    ttl: number;
  }) => {
    try {
      const exists = await this.client.exists(key);
      if (!exists) return false;
      return await this.setValue({key, value, ttl});
    } catch (error) {
      console.error("Redis UPDATE error:", error);
      return false;
    }
  };

  deleteKey = async (key: string[] | string) => {
    try {
      if (!key.length) return 0;
      const result = await this.client.del(key);
      return result === 1;
    } catch (error) {
      console.error("Redis DELETE error:", error);
      return false;
    }
  };

  expire = async ({key, ttl}: {key: string; ttl: number}) => {
    try {
      const result = await this.client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error("Redis EXPIRE error:", error);
      return false;
    }
  };

  ttl = async (key: string) => {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error("Redis TTL error:", error);
      return -2;
    }
  };

  keys = async (pattern: string[] | string) => {
    return await this.client.keys(`${pattern}*`);
  };

  incr = async (key: string) => {
    return await this.client.incr(key);
  };

  key(userId: Types.ObjectId) {
    return `user:FCM:${userId}`;
  }
  async addFCM({userId, FCMToken}: {userId: Types.ObjectId; FCMToken: string}) {
    return await this.client.sAdd(this.key(userId), FCMToken);
  }

  async removeFCM({
    userId,
    FCMToken,
  }: {
    userId: Types.ObjectId;
    FCMToken: string;
  }) {
    return await this.client.sRem(this.key(userId), FCMToken);
  }

  async getFCMs(userId: Types.ObjectId) {
    return await this.client.sMembers(this.key(userId));
  }

  async hasFCMs(userId: Types.ObjectId) {
    return await this.client.sCard(this.key(userId));
  }

  async removeFCMUser(userId: Types.ObjectId) {
    return await this.client.del(this.key(userId));
  }
}

export default new RedisService();
