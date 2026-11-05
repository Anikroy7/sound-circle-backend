import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Pagination } from "nestjs-typeorm-paginate";
import { UserEntity } from "@soundcircle/shared/database/entities/identity/user.entity";
import { UserLocationEntity } from "@soundcircle/shared/database/entities/identity/user-location.entity";
import { LocationEntity } from "@soundcircle/shared/database/entities/reference/location.entity";
import { UserRepository } from "@soundcircle/shared/database/repositories/identity/user.repository";
import { UserLocationRepository } from "@soundcircle/shared/database/repositories/identity/user-location.repository";
import { LocationRepository } from "@soundcircle/shared/database/repositories/reference/location.repository";
import { FilterUserDto } from "@soundcircle/shared/utils/dtos/identity/filter-user.dto";
import { PG_UNIQUE_VIOLATION } from "@soundcircle/shared/utils/util/constant";
import { dropCoveredLocations } from "@soundcircle/shared/utils/util/location.util";
import { hashPassword } from "@soundcircle/shared/utils/util/password.util";
import { CreateUserDto } from "@apps/core-api/modules/user/dto/create-user.dto";
import { UserWithLocations } from "@apps/core-api/modules/user/common/types/user.type";

@Injectable()
export class UserService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly userRepository: UserRepository,
    private readonly userLocationRepository: UserLocationRepository,
    private readonly locationRepository: LocationRepository,
  ) {}

  async getAll(filters?: FilterUserDto): Promise<Pagination<UserEntity> | UserEntity[]> {
    return this.userRepository.getAll(filters);
  }

  async create(reqDto: CreateUserDto): Promise<UserWithLocations> {
    // ⚠ The raw password never reaches the entity — only its hash does.
    const { password, location_ids, ...columns } = reqDto;
    const locations = await this.resolveLocations(location_ids);
    const passwordHash = password ? await hashPassword(password) : null;

    let userId: number;
    try {
      // Two tables, all or nothing — and every write through `manager`, never a repository.
      userId = await this.dataSource.transaction(async (manager) => {
        const user = manager.create(UserEntity, { ...columns, password_hash: passwordHash });
        await manager.save(user);

        if (locations.length) {
          await manager.save(locations.map((location) => manager.create(UserLocationEntity, { user_id: user.id, location_id: location.id })));
        }

        return user.id;
      });
    } catch (error: any) {
      // The unique index is the guarantee; `@IsUnique` only buys the friendlier 400 when there is no race.
      if (error?.code === PG_UNIQUE_VIOLATION) throw new ConflictException("Email or phone is already registered");
      throw error;
    }

    const user = await this.userRepository.getOne(userId);
    return Object.assign(user, { locations: await this.userLocationRepository.getByUserId(userId) });
  }

  /** Unknown ids → 400; a pick another pick already covers is dropped (schema-design §4.1). */
  private async resolveLocations(ids?: number[]): Promise<LocationEntity[]> {
    if (!ids?.length) return [];

    const found = await this.locationRepository.getByIds(ids);
    const unknown = ids.filter((id) => !found.some((location) => location.id === id));
    if (unknown.length) throw new BadRequestException(`Unknown location id(s): ${unknown.join(", ")}`);

    return dropCoveredLocations(found);
  }
}
