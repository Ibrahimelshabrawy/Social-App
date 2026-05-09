import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  AWS_ACCESS_KEY,
  AWS_BUCKET_NAME,
  AWS_REGION,
  AWS_SECRET_ACCESS_KEY,
} from "../../../config/config.service";
import {StoreEnum} from "../../enum/multer.enum";
import fs from "node:fs";
import {randomUUID} from "node:crypto";
import {AppError} from "../global-error-handling";
import {Upload} from "@aws-sdk/lib-storage";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";

export class S3Service {
  private client: S3Client;
  constructor() {
    this.client = new S3Client({
      region: AWS_REGION!,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY!,
        secretAccessKey: AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async uploadFile({
    file,
    store_type = StoreEnum.memory,
    path = "General",
    ACL = ObjectCannedACL.private,
  }: {
    file: Express.Multer.File;
    store_type?: StoreEnum;
    path?: string;
    ACL?: ObjectCannedACL;
  }): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: `social_app/${path}/${randomUUID()}___${file.originalname}`,
      ACL,
      Body:
        store_type === StoreEnum.disk
          ? fs.createReadStream(file.path)
          : file.buffer,
      ContentType: file.mimetype,
    });
    if (!command.input.Key) {
      throw new AppError("Fail To Upload File");
    }
    await this.client.send(command);
    return command.input.Key;
  }

  async uploadLargeFile({
    file,
    store_type = StoreEnum.memory,
    path = "General",
    ACL = ObjectCannedACL.private,
  }: {
    file: Express.Multer.File;
    store_type?: StoreEnum;
    path?: string;
    ACL?: ObjectCannedACL;
  }): Promise<string> {
    const command = new Upload({
      client: this.client,
      params: {
        Bucket: AWS_BUCKET_NAME,
        Key: `social_app/${path}/${randomUUID()}___${file.originalname}`,
        ACL,
        Body:
          store_type === StoreEnum.disk
            ? fs.createReadStream(file.path)
            : file.buffer,
        ContentType: file.mimetype,
      },
    });

    const result = await command.done();
    return result.Key!;
  }

  async uploadFiles({
    files,
    store_type = StoreEnum.memory,
    path = "General",
    ACL = ObjectCannedACL.private,
    isLarge = false,
  }: {
    files: Express.Multer.File[];
    store_type?: StoreEnum;
    path?: string;
    ACL?: ObjectCannedACL;
    isLarge?: boolean;
  }) {
    let urls = [];
    if (isLarge) {
      urls = await Promise.all(
        files.map((file) => {
          return this.uploadLargeFile({
            file,
            store_type,
            path,
            ACL,
          });
        }),
      );
    } else {
      urls = await Promise.all(
        files.map((file) => {
          return this.uploadFile({file, store_type, path, ACL});
        }),
      );
    }

    return urls;
  }

  async getFile(Key: string) {
    const command = new GetObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key,
    });

    return await this.client.send(command);
  }

  async createPreSignedUrl({
    path,
    fileName,
    ContentType,
    expiresIn = 60,
  }: {
    path: string;
    fileName: string;
    ContentType: string;
    expiresIn?: number;
  }) {
    const Key = `social_app/${path}/${randomUUID()}__${fileName}`;
    const command = new PutObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key,
      ContentType,
    });

    const url = await getSignedUrl(this.client, command, {expiresIn});
    return {Key, url};
  }

  async getPreSignedUrl({
    Key,
    expiresIn = 60,
    download = "true",
  }: {
    Key: string;
    expiresIn?: number;
    download?: string | undefined;
  }) {
    const command = new GetObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key,
      ResponseContentDisposition: download
        ? `attachment; filename="${Key.split("/").pop()}"`
        : undefined,
    });

    const url = await getSignedUrl(this.client, command, {expiresIn});
    return url;
  }

  async getFiles(folderName: string) {
    const command = new ListObjectsV2Command({
      Bucket: AWS_BUCKET_NAME,
      Prefix: `social_app/${folderName}`,
    });

    return await this.client.send(command);
  }

  async deleteFile(Key: string) {
    const command = new DeleteObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key,
    });

    return await this.client.send(command);
  }

  async deleteFiles(Keys: string[]) {
    const keyMapped = Keys.map((k) => {
      return {Key: k};
    });
    const command = new DeleteObjectsCommand({
      Bucket: AWS_BUCKET_NAME,
      Delete: {
        Objects: keyMapped,
      },
    });

    return await this.client.send(command);
  }

  async deleteFolder(folderName: string) {
    const data = await this.getFiles(folderName);

    const keyMapped = data?.Contents?.map((k) => {
      return k.Key;
    });

    return await this.deleteFiles(keyMapped as string[]);
  }
}
