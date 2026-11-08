import { BadGatewayException, Injectable, Logger, OnApplicationBootstrap, ServiceUnavailableException } from "@nestjs/common";
import { ENV } from "@soundcircle/shared/utils/util/constant";
import { signCloudinaryParams } from "@soundcircle/shared/utils/util/cloudinary.util";
import { CloudinaryResource, CloudinaryResourceType, UploadTicket } from "@apps/core-api/modules/media/common/types/media.type";

const API_BASE = "https://api.cloudinary.com/v1_1";
const TIMEOUT_MS = 15_000;

/**
 * The only code that talks to Cloudinary (schema-design §4.3). Built on `fetch` and Node's crypto
 * rather than the SDK, like `jwt.util.ts`, so there is no dependency to keep patched.
 *
 * ⚠ `CLOUDINARY_API_SECRET` is read here and used only to sign; it is never returned or logged.
 */
@Injectable()
export class CloudinaryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CloudinaryService.name);

  /**
   * Checks the credentials once at startup (Admin API `ping`), so a wrong key shows up in the log
   * straight away instead of as a failed upload later. Never blocks or fails the boot.
   */
  onApplicationBootstrap(): void {
    void this.checkCredentials();
  }

  private async checkCredentials(): Promise<void> {
    const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = ENV;
    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn("CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are not set: photo and audio uploads are off");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(cloudName)}/ping`, {
        headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.ok) {
        this.logger.log(`Cloudinary credentials accepted (cloud "${cloudName}")`);
        return;
      }
      const detail = await response.text().catch(() => "");
      this.logger.error(
        `Cloudinary rejected the credentials (${response.status} ${detail.slice(0, 200)}): photo and audio uploads will fail. ` +
          "Copy the cloud name, API key and API secret from the Cloudinary console (Settings → API Keys) into .env and restart.",
      );
    } catch (error: any) {
      this.logger.warn(`Could not reach Cloudinary to check the credentials: ${error?.message}`);
    }
  }

  private get config(): { cloudName: string; apiKey: string; apiSecret: string } {
    const cloudName = ENV.CLOUDINARY_CLOUD_NAME;
    const apiKey = ENV.CLOUDINARY_API_KEY;
    const apiSecret = ENV.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      // Names only, never values. `env-cmd` reads .env once at launch, so a value added later needs a full restart.
      const missing = Object.entries({ CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret })
        .filter(([, value]) => !value)
        .map(([name]) => name);
      this.logger.error(
        `Upload refused: ${missing.join(", ")} not set in this process. Add to .env and fully restart the API (watch reloads keep the old env).`,
      );
      throw new ServiceUnavailableException("File uploads are not available right now");
    }
    return { cloudName, apiKey, apiSecret };
  }

  /**
   * Signs one upload of exactly `publicId`. The client must send every field back unchanged: a
   * different id, format list or `overwrite` breaks the signature and Cloudinary refuses the upload.
   */
  signUpload(resourceType: CloudinaryResourceType, publicId: string, allowedFormats: string[]): UploadTicket {
    const { cloudName, apiKey, apiSecret } = this.config;
    const fields = {
      public_id: publicId,
      timestamp: String(Math.floor(Date.now() / 1000)),
      // Never replace an asset already at this id, even if the same ticket is used twice.
      overwrite: "false",
      allowed_formats: allowedFormats.join(","),
    };

    return {
      upload_url: `${API_BASE}/${encodeURIComponent(cloudName)}/${resourceType}/upload`,
      fields: { ...fields, api_key: apiKey, signature: signCloudinaryParams(fields, apiSecret) },
    };
  }

  /** The asset as Cloudinary stores it (Admin API), or null when nothing is at that id. */
  async getResource(resourceType: CloudinaryResourceType, publicId: string): Promise<CloudinaryResource | null> {
    const { cloudName, apiKey, apiSecret } = this.config;
    const path = publicId.split("/").map(encodeURIComponent).join("/");

    const response = await this.call(`${API_BASE}/${encodeURIComponent(cloudName)}/resources/${resourceType}/upload/${path}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}` },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw await this.failure("look up", response);

    return (await response.json()) as CloudinaryResource;
  }

  /** Deletes the asset and purges it from the CDN. "not found" counts as done. */
  async destroy(resourceType: CloudinaryResourceType, publicId: string): Promise<void> {
    const { cloudName, apiKey, apiSecret } = this.config;
    const params = { public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)), invalidate: "true" };
    const body = new URLSearchParams({ ...params, api_key: apiKey, signature: signCloudinaryParams(params, apiSecret) });

    const response = await this.call(`${API_BASE}/${encodeURIComponent(cloudName)}/${resourceType}/destroy`, { method: "POST", body });
    if (!response.ok) throw await this.failure("delete", response);
  }

  private async call(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error: any) {
      this.logger.error(`Cloudinary request failed: ${error?.message}`);
      throw new BadGatewayException("Our file storage is not responding. Please try again");
    }
  }

  /** Logs Cloudinary's own error (it never contains the secret) and hides it from the client. */
  private async failure(action: string, response: Response): Promise<BadGatewayException> {
    const detail = await response.text().catch(() => "");
    this.logger.error(`Cloudinary ${action} returned ${response.status}: ${detail.slice(0, 300)}`);
    return new BadGatewayException("Our file storage could not handle that request. Please try again");
  }
}
