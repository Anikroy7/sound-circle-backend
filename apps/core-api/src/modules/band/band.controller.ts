import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthBaseController } from "@soundcircle/shared/utils/controllers/auth-base-controller";
import { ApiResponse } from "@soundcircle/shared/utils/util/utils";
import { UploadTicket } from "@apps/core-api/modules/media/common/types/media.type";
import { BandService } from "@apps/core-api/modules/band/band.service";
import { BandDashboardView, BandView, MemberCandidateView, MyBandView } from "@apps/core-api/modules/band/common/types/band.type";
import {
  AddBandMemberDto,
  AddOpenRoleDto,
  AttachBandPhotoDto,
  BandImageDto,
  MemberSearchDto,
  SaveIntroductionDto,
  SaveBandInfoDto,
  UpdateBandVideosDto,
} from "@apps/core-api/modules/band/dto/band.dto";

/**
 * Creating and running a band (schema-design §4.5). Signed in; every `:id` route is the band owner's
 * only, and a band the caller does not own answers 404.
 */
@ApiTags("BAND")
@Controller("bands")
export class BandController extends AuthBaseController {
  constructor(private readonly bandService: BandService) {
    super();
  }

  @Get("me")
  @ApiOperation({ summary: "Every band I'm in, owned first; my own drafts too" })
  async getMine(): Promise<MyBandView[]> {
    const bands: MyBandView[] = await this.bandService.getMine();
    return ApiResponse(bands, "Fetch Successfully");
  }

  @Get(":id/dashboard")
  @ApiOperation({ summary: "The band's own dashboard, for its members; the owner also gets its invitations and join requests" })
  async getDashboard(@Param("id", ParseIntPipe) id: number): Promise<BandDashboardView> {
    const dashboard: BandDashboardView = await this.bandService.getDashboard(id);
    return ApiResponse(dashboard, "Fetch Successfully");
  }

  @Post(":id/members/me/welcome")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "I saw my welcome to the band (and skipped the introduction)" })
  async markWelcomed(@Param("id", ParseIntPipe) id: number): Promise<BandView> {
    const band: BandView = await this.bandService.markWelcomed(id);
    return ApiResponse(band, "Updated Successfully");
  }

  @Put(":id/members/me/introduction")
  @ApiOperation({ summary: "My introduction to the band: a short note, favourite genres, interests (each optional)" })
  async saveIntroduction(@Param("id", ParseIntPipe) id: number, @Body() reqDto: SaveIntroductionDto): Promise<BandView> {
    const band: BandView = await this.bandService.saveIntroduction(id, reqDto);
    return ApiResponse(band, "Updated Successfully");
  }

  @Post(":id/leave")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Leave the band (members only; the owner can't)" })
  async leave(@Param("id", ParseIntPipe) id: number): Promise<null> {
    await this.bandService.leave(id);
    return ApiResponse(null, "Deleted Successfully");
  }

  @Post(":id/open-roles")
  @ApiOperation({ summary: "Open a position for an instrument (one per instrument)" })
  async addOpenRole(@Param("id", ParseIntPipe) id: number, @Body() reqDto: AddOpenRoleDto): Promise<BandView> {
    const band: BandView = await this.bandService.addOpenRole(id, reqDto);
    return ApiResponse(band, "Created Successfully");
  }

  @Delete(":id/open-roles/:roleId")
  @ApiOperation({ summary: "Close an open position" })
  async closeOpenRole(@Param("id", ParseIntPipe) id: number, @Param("roleId", ParseIntPipe) roleId: number): Promise<BandView> {
    const band: BandView = await this.bandService.closeOpenRole(id, roleId);
    return ApiResponse(band, "Deleted Successfully");
  }

  @Get("me/draft")
  @ApiOperation({ summary: "My band still being created, or null" })
  async getDraft(): Promise<BandView | null> {
    const band: BandView | null = await this.bandService.getDraft();
    return ApiResponse(band, "Fetch Successfully");
  }

  @Put("me/draft")
  @ApiOperation({ summary: "Creation step 1: band information. Creates my draft (me as owner) or updates it" })
  async saveDraftInfo(@Body() reqDto: SaveBandInfoDto): Promise<BandView> {
    const band: BandView = await this.bandService.saveDraftInfo(reqDto);
    return ApiResponse(band, "Updated Successfully");
  }

  @Post(":id/logo/signature")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logo, upload step 1: a signed Cloudinary upload for one image" })
  async createLogoTicket(@Param("id", ParseIntPipe) id: number): Promise<UploadTicket> {
    const ticket: UploadTicket = await this.bandService.createLogoTicket(id);
    return ApiResponse(ticket, "Created Successfully");
  }

  @Put(":id/logo")
  @ApiOperation({ summary: "Logo, upload step 3: save it (checked against Cloudinary); replaces any previous logo" })
  async setLogo(@Param("id", ParseIntPipe) id: number, @Body() reqDto: BandImageDto): Promise<BandView> {
    const band: BandView = await this.bandService.setLogo(id, reqDto);
    return ApiResponse(band, "Updated Successfully");
  }

  @Get(":id/member-candidates")
  @ApiOperation({ summary: "Creation step 2: SoundCircle users matching ?q= by name, not already in the band" })
  async searchCandidates(@Param("id", ParseIntPipe) id: number, @Query() query: MemberSearchDto): Promise<MemberCandidateView[]> {
    const candidates: MemberCandidateView[] = await this.bandService.searchCandidates(id, query.q);
    return ApiResponse(candidates, "Fetch Successfully");
  }

  @Post(":id/member-photo/signature")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Creation step 2: a signed upload for the photo of a member outside SoundCircle" })
  async createMemberPhotoTicket(@Param("id", ParseIntPipe) id: number): Promise<UploadTicket> {
    const ticket: UploadTicket = await this.bandService.createMemberPhotoTicket(id);
    return ApiResponse(ticket, "Created Successfully");
  }

  @Post(":id/members")
  @ApiOperation({ summary: "Creation step 2 / Invite Members: add a SoundCircle user, or a member outside SoundCircle" })
  async addMember(@Param("id", ParseIntPipe) id: number, @Body() reqDto: AddBandMemberDto): Promise<BandView> {
    const band: BandView = await this.bandService.addMember(id, reqDto);
    return ApiResponse(band, "Created Successfully");
  }

  @Delete(":id/members/:memberId")
  @ApiOperation({ summary: "Remove a member (not the owner)" })
  async removeMember(@Param("id", ParseIntPipe) id: number, @Param("memberId", ParseIntPipe) memberId: number): Promise<BandView> {
    const band: BandView = await this.bandService.removeMember(id, memberId);
    return ApiResponse(band, "Deleted Successfully");
  }

  @Post(":id/photos/signature")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Creation step 3: a signed upload for one performance photo" })
  async createPhotoTicket(@Param("id", ParseIntPipe) id: number): Promise<UploadTicket> {
    const ticket: UploadTicket = await this.bandService.createPhotoTicket(id);
    return ApiResponse(ticket, "Created Successfully");
  }

  @Post(":id/photos")
  @ApiOperation({ summary: "Creation step 3: save an uploaded performance photo (checked against Cloudinary)" })
  async attachPhoto(@Param("id", ParseIntPipe) id: number, @Body() reqDto: AttachBandPhotoDto): Promise<BandView> {
    const band: BandView = await this.bandService.attachPhoto(id, reqDto);
    return ApiResponse(band, "Created Successfully");
  }

  @Delete(":id/photos/:mediaId")
  @ApiOperation({ summary: "Remove a performance photo; it is deleted from Cloudinary too" })
  async removePhoto(@Param("id", ParseIntPipe) id: number, @Param("mediaId", ParseIntPipe) mediaId: number): Promise<BandView> {
    const band: BandView = await this.bandService.removePhoto(id, mediaId);
    return ApiResponse(band, "Deleted Successfully");
  }

  @Put(":id/videos")
  @ApiOperation({ summary: "Creation step 3: the performance video links (replaces them)" })
  async saveVideos(@Param("id", ParseIntPipe) id: number, @Body() reqDto: UpdateBandVideosDto): Promise<BandView> {
    const band: BandView = await this.bandService.saveVideos(id, reqDto);
    return ApiResponse(band, "Updated Successfully");
  }

  @Post(":id/publish")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Publish the band: it becomes public at /bands/<slug>" })
  async publish(@Param("id", ParseIntPipe) id: number): Promise<BandView> {
    const band: BandView = await this.bandService.publish(id);
    return ApiResponse(band, "Updated Successfully");
  }
}
