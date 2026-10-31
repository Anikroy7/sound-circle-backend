import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Pagination } from "nestjs-typeorm-paginate";
import { PublicBaseController } from "@soundcircle/shared/utils/controllers/public-base-controller";
import { UserEntity } from "@soundcircle/shared/database/entities/identity/user.entity";
import { FilterUserDto } from "@soundcircle/shared/utils/dtos/identity/filter-user.dto";
import { ApiResponse } from "@soundcircle/shared/utils/util/utils";
import { UserService } from "@apps/core-api/modules/user/user.service";
import { CreateUserDto } from "@apps/core-api/modules/user/dto/create-user.dto";

/** ⚠ Public until auth lands — which is why `GET /users` masks every non-PUBLIC email and phone. */
@ApiTags("IDN")
@Controller("users")
export class UserPublicController extends PublicBaseController {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Get()
  async getAll(@Query() filters: FilterUserDto): Promise<Pagination<UserEntity> | UserEntity[]> {
    const users: Pagination<UserEntity> | UserEntity[] = await this.userService.getAll(filters);
    return ApiResponse(users, "Fetch Successfully");
  }

  @Post()
  @ApiOperation({ summary: "Create a user with an email and/or phone" })
  async create(@Body() reqDto: CreateUserDto): Promise<UserEntity> {
    const user: UserEntity = await this.userService.create(reqDto);
    return ApiResponse(user, "Created Successfully");
  }
}
