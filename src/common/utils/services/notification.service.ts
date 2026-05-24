import admin from "firebase-admin";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

class NotificationService {
  private readonly client: admin.app.App;
  constructor() {
    const serviceAccount = JSON.parse(
      readFileSync(
        resolve(
          __dirname,
          "../../../config/socialapp-9dc81-firebase-adminsdk-fbsvc-aa446e27ff.json",
        ),
        "utf-8",
      ),
    );
    this.client = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  async sendNotification({
    token,
    data,
  }: {
    token: string;
    data: {
      title: string;
      body: string;
    };
  }) {
    const message = {
      token,
      data,
    };
    return await this.client.messaging().send(message);
  }

  async sendNotifications({
    tokens,
    data,
  }: {
    tokens: string[];
    data: {
      title: string;
      body: string;
    };
  }) {
    return await Promise.all(
      tokens.map((token) => {
        return this.sendNotification({token, data});
      }),
    );
  }
}

export default new NotificationService();
