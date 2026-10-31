import { ConflictException, Injectable } from "@nestjs/common";
import { Pagination } from "nestjs-typeorm-paginate";
import { UserEntity } from "@soundcircle/shared/database/entities/identity/user.entity";
import { UserRepository } from "@soundcircle/shared/database/repositories/identity/user.repository";
import { FilterUserDto } from "@soundcircle/shared/utils/dtos/identity/filter-user.dto";
import { PG_UNIQUE_VIOLATION } from "@soundcircle/shared/utils/util/constant";
import { hashPassword } from "@soundcircle/shared/utils/util/password.util";
import { CreateUserDto } from "@apps/core-api/modules/user/dto/create-user.dto";

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getAll(filters?: FilterUserDto): Promise<Pagination<UserEntity> | UserEntity[]> {
    return this.userRepository.getAll(filters);
  }

  async create(reqDto: CreateUserDto): Promise<UserEntity> {
    // ⚠ The raw password never reaches the entity — only its hash does.
    const { password, ...columns } = reqDto;
    const user = this.userRepository.create({ ...columns, password_hash: password ? await hashPassword(password) : null });

    try {
      await this.userRepository.save(user);
    } catch (error: any) {
      // The unique index is the guarantee; `@IsUnique` only buys the friendlier 400 when there is no race.
      if (error?.code === PG_UNIQUE_VIOLATION) throw new ConflictException("Email or phone is already registered");
      throw error;
    }

    return this.userRepository.getOne(user.id);
  }
}
