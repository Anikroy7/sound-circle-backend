import { MediaOwnerType } from "@soundcircle/shared/database/entities/media/enums/media.enum";

/** Cloudinary files audio under its `video` resource type. */
export type CloudinaryResourceType = "image" | "video";

/** Who a portfolio item belongs to. The caller has already checked the signed-in user may write to it. */
export interface MediaOwner {
  type: MediaOwnerType;
  id: number;
  /** How many items of the requested kind this owner may hold. */
  limit: number;
}

/** What the browser needs to upload one file straight to Cloudinary: POST `fields` plus `file` to `upload_url`. */
export interface UploadTicket {
  upload_url: string;
  fields: Record<string, string>;
}

/** The fields of Cloudinary's Admin API resource answer this service reads. */
export interface CloudinaryResource {
  public_id: string;
  resource_type: CloudinaryResourceType;
  format: string;
  bytes: number;
  secure_url: string;
  /** Video resources: false when the file has a picture track, i.e. it is a video, not audio. */
  is_audio?: boolean;
  duration?: number;
}
