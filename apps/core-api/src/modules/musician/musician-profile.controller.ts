import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthBaseController } from "@soundcircle/shared/utils/controllers/auth-base-controller";
import { ApiResponse } from "@soundcircle/shared/utils/util/utils";
import { UploadTicket } from "@apps/core-api/modules/media/common/types/media.type";
import { MusicianProfileService } from "@apps/core-api/modules/musician/musician-profile.service";
import { BandExperienceDto } from "@apps/core-api/modules/musician/dto/band-experience.dto";
import { AttachMediaDto, MediaTargetDto, SetProfilePhotoDto } from "@apps/core-api/modules/musician/dto/profile-media.dto";
import {
  CompleteBandExperienceDto,
  UpdateAboutDto,
  UpdateAvailabilityDto,
  UpdateBandInterestDto,
  UpdateContactDto,
  UpdateGalleryDto,
  UpdateGenresDto,
  UpdateInstrumentsDto,
  UpdateLocationsDto,
} from "@apps/core-api/modules/musician/dto/profile-steps.dto";
import { MusicianProfileView } from "@apps/core-api/modules/musician/common/types/musician-profile.type";

/**
 * The signed-in musician's own profile and its eight setup steps (schema-design §4.4). Always `me`:
 * no route here takes a user id, so nobody can write to someone else's profile.
 * Every write answers with the whole profile, so the wizard never stitches partial state together.
 */
@ApiTags("MUS")
@Controller("profiles/me")
export class MusicianProfileController extends AuthBaseController {
  constructor(private readonly musicianProfileService: MusicianProfileService) {
    super();
  }

  @Get()
  @ApiOperation({ summary: "My profile, with setup_step and profile_completion; empty (id null) before step 1" })
  async getMine(): Promise<MusicianProfileView> {
    const profile: MusicianProfileView = await this.musicianProfileService.getMine();
    return ApiResponse(profile, "Fetch Successfully");
  }

  @Put("about")
  @ApiOperation({ summary: "Step 1: bio and locations (replaces the set). Creates the profile" })
  async saveAbout(@Body() reqDto: UpdateAboutDto): Promise<MusicianProfileView> {
    const profile: MusicianProfileView = await this.musicianProfileService.saveAbout(reqDto);
    return ApiResponse(profile, "Updated Successfully");
  }

  @Put("locations")
  @ApiOperation({ summary: "My locations on their own, from the profile page (replaces the set; at least one). Not a step save" })
  async saveLocations(@Body() reqDto: UpdateLocationsDto): Promise<MusicianProfileView> {
    const profile: MusicianProfileView = await this.musicianProfileService.saveLocations(reqDto);
    return ApiResponse(profile, "Updated Successfully");
  }

  @Put("genres")
  @ApiOperation({ summary: "Step 2: genres performed and listened to (replaces both lists)" })
  async saveGenres(@Body() reqDto: UpdateGenresDto): Promise<MusicianProfileView> {
    const profile: MusicianProfileView = await this.musicianProfileService.saveGenres(reqDto);
    return ApiResponse(profile, "Updated Successfully");
  }

  @Put("instruments")
  @ApiOperation({ summary: "Step 3: instruments, each with a skill level (replaces the list)" })
  async saveInstruments(@Body() reqDto: UpdateInstrumentsDto): Promise<MusicianProfileView> {
    const profile: MusicianProfileView = await this.musicianProfileService.saveInstruments(reqDto);
    return ApiResponse(profile, "Updated Successfully");
  }

  @Put("contact")
  @ApiOperation({ summary: "Step 4: phone and whether it is public. 409 if another account has the number" })
  async saveContact(@Body() reqDto: UpdateContactDto): Promise<MusicianProfileView> {
    const profile: MusicianProfileView = await this.musicianProfileService.saveContact(reqDto);
    return ApiResponse(profile, "Updated Successfully");
  }

  @Put("availability")
  @ApiOperation({ summary: "Step 5: availability slots (replaces the list)" })
  async saveAvailability(@Body() reqDto: UpdateAvailabilityDto): Promise<MusicianProfileView> {
    const profile: MusicianProfileView = await this.musicianProfileService.saveAvailability(reqDto);
    return ApiResponse(profile, "Updated Successfully");
  }

  @Put("band-interest")
  @ApiOperation({ summary: "Step 6: interest in joining a band" })
  async saveBandInterest(@Body() reqDto: UpdateBandInterestDto): Promise<MusicianProfileView> {
    const profile: MusicianProfileView = await this.musicianProfileService.saveBandInterest(reqDto);
    return ApiResponse(profile, "Updated Successfully");
  }

  @Put("gallery")
  @ApiOperation({ summary: "Step 7: gallery video links (replaces them). Audio and photos are saved through /media as they upload" })
  async saveGallery(@Body() reqDto: UpdateGalleryDto): Promise<MusicianProfileView> {
    const profile: MusicianProfileView = await this.musicianProfileService.saveGallery(reqDto);
    return ApiResponse(profile, "Updated Successfully");
  }

  @Put("band-experience")
  @ApiOperation({ summary: "Step 8: finish, answering whether the musician has been in a band" })
  async completeBandExperience(@Body() reqDto: CompleteBandExperienceDto): Promise<MusicianProfileView> {
    const profile: MusicianProfileView = await this.musicianProfileService.completeBandExperience(reqDto);
    return ApiResponse(profile, "Updated Successfully");
  }

  @Post("band-experiences")
  @ApiOperation({ summary: "Step 8: add a band, with its video links" })
  async createBandExperience(@Body() reqDto: BandExperienceDto): Promise<MusicianProfileView> {
    const profile: MusicianProfileView = await this.musicianProfileService.createBandExperience(reqDto);
    return ApiResponse(profile, "Created Successfully");
  }

  @Patch("band-experiences/:id")
  @ApiOperation({ summary: "Step 8: edit a band (replaces its video links)" })
  async updateBandExperience(@Param("id", ParseIntPipe) id: number, @Body() reqDto: BandExperienceDto): Promise<MusicianProfileView> {
    const profile: MusicianProfileView = await this.musicianProfileService.updateBandExperience(id, reqDto);
    return ApiResponse(profile, "Updated Successfully");
  }

  @Delete("band-experiences/:id")
  @ApiOperation({ summary: "Step 8: remove a band, with its photos and video links" })
  async removeBandExperience(@Param("id", ParseIntPipe) id: number): Promise<MusicianProfileView> {
    const profile: MusicianProfileView = await this.musicianProfileService.removeBandExperience(id);
    return ApiResponse(profile, "Deleted Successfully");
  }

  @Post("photo/signature")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Profile photo, step 1: a signed Cloudinary upload for one image" })
  async createPhotoTicket(): Promise<UploadTicket> {
    const ticket: UploadTicket = this.musicianProfileService.createPhotoTicket();
    return ApiResponse(ticket, "Created Successfully");
  }

  @Put("photo")
  @ApiOperation({ summary: "Profile photo, step 3: save the upload (checked against Cloudinary); replaces any previous photo" })
  async setPhoto(@Body() reqDto: SetProfilePhotoDto): Promise<MusicianProfileView> {
    const profile: MusicianProfileView = await this.musicianProfileService.setPhoto(reqDto);
    return ApiResponse(profile, "Updated Successfully");
  }

  @Delete("photo")
  @ApiOperation({ summary: "Remove my profile photo; it is deleted from Cloudinary too" })
  async removePhoto(): Promise<MusicianProfileView> {
    const profile: MusicianProfileView = await this.musicianProfileService.removePhoto();
    return ApiResponse(profile, "Deleted Successfully");
  }

  @Post("media/signature")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Upload flow step 1: a signed Cloudinary upload for one file (schema-design §4.3)" })
  async createUploadTicket(@Body() reqDto: MediaTargetDto): Promise<UploadTicket> {
    const ticket: UploadTicket = await this.musicianProfileService.createUploadTicket(reqDto);
    return ApiResponse(ticket, "Created Successfully");
  }

  @Post("media")
  @ApiOperation({ summary: "Upload flow step 3: save an uploaded file. Size and format are checked against Cloudinary" })
  async attachMedia(@Body() reqDto: AttachMediaDto): Promise<MusicianProfileView> {
    const profile: MusicianProfileView = await this.musicianProfileService.attachMedia(reqDto);
    return ApiResponse(profile, "Created Successfully");
  }

  @Delete("media/:id")
  @ApiOperation({ summary: "Remove one of my files; it is deleted from Cloudinary too" })
  async removeMedia(@Param("id", ParseIntPipe) id: number): Promise<MusicianProfileView> {
    const profile: MusicianProfileView = await this.musicianProfileService.removeMedia(id);
    return ApiResponse(profile, "Deleted Successfully");
  }
}
