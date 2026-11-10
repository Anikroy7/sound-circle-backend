import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthBaseController } from "@soundcircle/shared/utils/controllers/auth-base-controller";
import { ApiResponse } from "@soundcircle/shared/utils/util/utils";
import { InviteOptionView, MembershipInboxView, MembershipRequestView } from "@apps/core-api/modules/band/common/types/band.type";
import { CreateInvitationDto, CreateJoinRequestDto } from "@apps/core-api/modules/band/membership/dto/membership-request.dto";
import { MembershipRequestService } from "@apps/core-api/modules/band/membership/membership-request.service";

/**
 * Invitations and join requests (schema-design §4.5). Signed in; a request the caller may not act on
 * answers 404, and one already answered answers 409.
 */
@ApiTags("BAND")
@Controller("membership-requests")
export class MembershipRequestController extends AuthBaseController {
  constructor(private readonly membershipRequestService: MembershipRequestService) {
    super();
  }

  @Get("me")
  @ApiOperation({ summary: "My dashboard: pending invitations to me and join requests to my bands, plus what I've sent" })
  async getInbox(): Promise<MembershipInboxView> {
    const inbox: MembershipInboxView = await this.membershipRequestService.getInbox();
    return ApiResponse(inbox, "Fetch Successfully");
  }

  @Get("invite-options/:userId")
  @ApiOperation({ summary: "My published bands and where each stands with this musician (member, invited, requested or free)" })
  async getInviteOptions(@Param("userId", ParseIntPipe) userId: number): Promise<InviteOptionView[]> {
    const options: InviteOptionView[] = await this.membershipRequestService.getInviteOptions(userId);
    return ApiResponse(options, "Fetch Successfully");
  }

  @Post("invitations")
  @ApiOperation({ summary: "Invite a musician to one of my published bands" })
  async invite(@Body() reqDto: CreateInvitationDto): Promise<MembershipRequestView> {
    const request: MembershipRequestView = await this.membershipRequestService.invite(reqDto);
    return ApiResponse(request, "Created Successfully");
  }

  @Post("join-requests")
  @ApiOperation({ summary: "Ask to fill one of a band's open positions (an instrument on my profile)" })
  async requestToJoin(@Body() reqDto: CreateJoinRequestDto): Promise<MembershipRequestView> {
    const request: MembershipRequestView = await this.membershipRequestService.requestToJoin(reqDto);
    return ApiResponse(request, "Created Successfully");
  }

  @Post(":id/accept")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Accept: the musician joins the band (an invitation is the musician's to accept, a join request the owner's)" })
  async accept(@Param("id", ParseIntPipe) id: number): Promise<MembershipRequestView> {
    const request: MembershipRequestView = await this.membershipRequestService.accept(id);
    return ApiResponse(request, "Updated Successfully");
  }

  @Post(":id/decline")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Decline an invitation or a join request" })
  async decline(@Param("id", ParseIntPipe) id: number): Promise<MembershipRequestView> {
    const request: MembershipRequestView = await this.membershipRequestService.decline(id);
    return ApiResponse(request, "Updated Successfully");
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Withdraw something I sent" })
  async cancel(@Param("id", ParseIntPipe) id: number): Promise<MembershipRequestView> {
    const request: MembershipRequestView = await this.membershipRequestService.cancel(id);
    return ApiResponse(request, "Updated Successfully");
  }
}
